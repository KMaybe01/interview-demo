package handlers

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

var (
	rsaPrivateKey *rsa.PrivateKey
	rsaPublicKey  *rsa.PublicKey
	rsaOnce       sync.Once
)

func initRSA() {
	rsaOnce.Do(func() {
		var err error
		rsaPrivateKey, err = rsa.GenerateKey(rand.Reader, 2048)
		if err != nil {
			log.Fatalf("Failed to generate RSA key: %v", err)
		}
		rsaPublicKey = &rsaPrivateKey.PublicKey
	})
}

type initEvent struct {
	Type         string `json:"type"`
	Key          string `json:"key,omitempty"`
	EncryptedKey string `json:"encryptedKey,omitempty"`
}

type chunkEvent struct {
	Seq      int     `json:"seq"`
	Data     string  `json:"data"`
	Progress float64 `json:"progress"`
	Total    int     `json:"total"`
}

func EncryptedLogStream(c *gin.Context) {
	initRSA()

	c.Writer.Header().Set("Content-Type", "text/event-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := c.Writer.(interface{ Flush() })
	if !ok {
		return
	}

	// 1. Check for client-provided RSA public key (query param: clientKey, SPKI DER base64)
	//    The client (decrypt.worker.ts) generates an ephemeral RSA key pair and sends
	//    its public key here. The server encrypts the AES key with the client's public key,
	//    so only the client can decrypt it — no private key is ever transmitted.
	clientKeyB64 := c.DefaultQuery("clientKey", "")
	useClientKey := clientKeyB64 != ""

	// 2. Generate ephemeral AES-256-GCM key
	aesKey := make([]byte, 32)
	if _, err := rand.Read(aesKey); err != nil {
		return
	}

	if useClientKey {
		// Proper flow: encrypt AES key with CLIENT's public key
		clientKeyDER, err := base64.StdEncoding.DecodeString(clientKeyB64)
		if err != nil {
			return
		}
		clientPubKey, err := x509.ParsePKIXPublicKey(clientKeyDER)
		if err != nil {
			return
		}
		rsaClientPub, ok := clientPubKey.(*rsa.PublicKey)
		if !ok {
			return
		}

		encryptedAESKey, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, rsaClientPub, aesKey, nil)
		if err != nil {
			return
		}
		initExchange, err := json.Marshal(initEvent{
			Type:         "key-exchange",
			EncryptedKey: base64.StdEncoding.EncodeToString(encryptedAESKey),
		})
		if err != nil {
			return
		}
		fmt.Fprintf(c.Writer, "data: %s\n\n", initExchange)
		flusher.Flush()
	} else {
		pubKeyDER, err := x509.MarshalPKIXPublicKey(rsaPublicKey)
		if err != nil {
			return
		}
		initPub, err := json.Marshal(initEvent{Type: "rsa-public-key", Key: base64.StdEncoding.EncodeToString(pubKeyDER)})
		if err != nil {
			return
		}
		fmt.Fprintf(c.Writer, "data: %s\n\n", initPub)
		flusher.Flush()

		encryptedAESKey, err := rsa.EncryptOAEP(sha256.New(), rand.Reader, rsaPublicKey, aesKey, nil)
		if err != nil {
			return
		}
		initExchange, err := json.Marshal(initEvent{
			Type:         "key-exchange",
			EncryptedKey: base64.StdEncoding.EncodeToString(encryptedAESKey),
		})
		if err != nil {
			return
		}
		fmt.Fprintf(c.Writer, "data: %s\n\n", initExchange)
		flusher.Flush()
	}

	// 3. Stream encrypted log chunks (simulate 25MB / 250000 lines)
	totalLines := 250000
	if limitStr := c.Query("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			totalLines = limit
		}
	}
	chunkSize := 100
	totalChunks := (totalLines + chunkSize - 1) / chunkSize
	firstChunkSmall := true

	logLevels := []string{"INFO", "WARN", "ERROR", "DEBUG"}
	actions := []string{
		"GET /api/users",
		"POST /api/data",
		"PUT /api/config",
		"DELETE /api/session",
		"PATCH /api/profile",
	}

	for chunkIdx := 0; chunkIdx < totalChunks; chunkIdx++ {
		select {
		case <-c.Request.Context().Done():
			return
		default:
		}

		linesThisChunk := chunkSize
		if firstChunkSmall {
			linesThisChunk = 10
			firstChunkSmall = false
		}

		var plaintext []byte
		for lineIdx := 0; lineIdx < linesThisChunk; lineIdx++ {
			lineNum := chunkIdx*chunkSize + lineIdx + 1
			if lineNum > totalLines {
				break
			}
			level := logLevels[lineNum%len(logLevels)]
			action := actions[lineNum%len(actions)]
			line := fmt.Sprintf("[%s] [%s] [req-%05d] %s - 200 %dms\n",
				level, time.Now().Format(time.RFC3339), lineNum, action, lineNum%100+10)
			plaintext = append(plaintext, []byte(line)...)
		}

		if len(plaintext) == 0 {
			continue
		}

		block, err := aes.NewCipher(aesKey)
		if err != nil {
			continue
		}
		gcm, err := cipher.NewGCM(block)
		if err != nil {
			continue
		}
		nonce := make([]byte, gcm.NonceSize())
		if _, err := rand.Read(nonce); err != nil {
			continue
		}
		ciphertext := gcm.Seal(nil, nonce, plaintext, nil)

		chunkData := append(nonce, ciphertext...)
		progress := float64(chunkIdx+1) / float64(totalChunks) * 100
		evt, err := json.Marshal(chunkEvent{
			Seq:      chunkIdx,
			Data:     base64.StdEncoding.EncodeToString(chunkData),
			Progress: progress,
			Total:    totalChunks,
		})
		if err != nil {
			continue
		}
		fmt.Fprintf(c.Writer, "data: %s\n\n", evt)
		flusher.Flush()

		if progress <= 10 {
			time.Sleep(5 * time.Millisecond)
		} else {
			time.Sleep(1 * time.Millisecond)
		}
	}

	fmt.Fprintf(c.Writer, "data: {\"type\":\"done\"}\n\n")
	flusher.Flush()
}
