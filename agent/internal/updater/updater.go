package updater

import (
	"crypto/ed25519"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"runtime"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/version"
)

// publicKeyB64 is injected at build time by build-releases.sh (ldflags -X).
// Updates are refused unless signed by the matching ed25519 private key —
// a compromised distribution server cannot push arbitrary binaries.
var publicKeyB64 string

func archTag() string {
	switch runtime.GOARCH {
	case "arm64":
		return "linux-arm64"
	case "arm":
		return "linux-armv7"
	default:
		return "linux-amd64"
	}
}

func CheckAndUpdate(client *api.Client, logger *zap.Logger) error {
	latest, err := client.GetLatestVersion(archTag())
	if err != nil {
		return fmt.Errorf("version check: %w", err)
	}
	if latest.Version == version.Current {
		return nil
	}

	logger.Info("new version available",
		zap.String("current", version.Current),
		zap.String("latest", latest.Version),
	)

	binary, err := downloadBinary(latest.URL)
	if err != nil {
		return fmt.Errorf("download failed: %w", err)
	}

	if err := verifySignature(binary, latest.Signature); err != nil {
		return fmt.Errorf("signature verification failed: %w", err)
	}

	return applyUpdate(binary)
}

func downloadBinary(url string) ([]byte, error) {
	c := &http.Client{Timeout: 5 * time.Minute}
	resp, err := c.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}

func verifySignature(binary []byte, sigB64 string) error {
	if publicKeyB64 == "" {
		return errors.New("no update public key embedded in this build")
	}
	pub, err := base64.StdEncoding.DecodeString(publicKeyB64)
	if err != nil || len(pub) != ed25519.PublicKeySize {
		return errors.New("invalid embedded public key")
	}
	sig, err := base64.StdEncoding.DecodeString(sigB64)
	if err != nil {
		return errors.New("invalid signature encoding")
	}
	if !ed25519.Verify(ed25519.PublicKey(pub), binary, sig) {
		return errors.New("ed25519 signature mismatch")
	}
	return nil
}

func applyUpdate(binary []byte) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	tmp := exe + ".new"
	if err := os.WriteFile(tmp, binary, 0755); err != nil {
		return err
	}
	if err := os.Rename(tmp, exe); err != nil {
		os.Remove(tmp)
		return err
	}
	// Replace the running process — no systemd restart needed
	return syscall.Exec(exe, os.Args, os.Environ())
}
