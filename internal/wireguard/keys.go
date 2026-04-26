package wireguard

import "golang.zx2c4.com/wireguard/wgctrl/wgtypes"

type KeyPair struct {
	Private string
	Public  string
}

func GenerateKeyPair() (*KeyPair, error) {
	key, err := wgtypes.GeneratePrivateKey()
	if err != nil {
		return nil, err
	}
	return &KeyPair{
		Private: key.String(),
		Public:  key.PublicKey().String(),
	}, nil
}
