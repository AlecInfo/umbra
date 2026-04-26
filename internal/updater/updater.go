package updater

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"syscall"
	"time"

	"go.uber.org/zap"

	"github.com/umbravpn/umbra-agent/internal/api"
	"github.com/umbravpn/umbra-agent/internal/version"
)

func CheckAndUpdate(client *api.Client, logger *zap.Logger) error {
	latest, err := client.GetLatestVersion()
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

	if !verifySignature(binary, latest.Signature) {
		return fmt.Errorf("signature verification failed")
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

func verifySignature(binary []byte, expectedSHA256 string) bool {
	h := sha256.Sum256(binary)
	return hex.EncodeToString(h[:]) == expectedSHA256
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
