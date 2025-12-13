#!/bin/bash
# Generate a long-lived bootstrap CA for x509pop agent attestation
# This CA is separate from the SPIRE Server's CA and used only for agent bootstrapping

set -e

OUTPUT_DIR="${1:-.}"

echo "Generating bootstrap CA for SPIRE agent x509pop attestation..."

# Generate CA private key (ECDSA P-256 for efficiency)
openssl ecparam -name prime256v1 -genkey -noout -out "$OUTPUT_DIR/bootstrap-ca.key"

# Generate CA certificate (valid for 10 years)
openssl req -new -x509 -sha256 -days 3650 \
    -key "$OUTPUT_DIR/bootstrap-ca.key" \
    -out "$OUTPUT_DIR/bootstrap-ca.crt" \
    -subj "/CN=SPIRE Bootstrap CA/O=ProtocolSoup/C=AU" \
    -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
    -addext "keyUsage=critical,keyCertSign,cRLSign"

echo "Generated bootstrap CA certificate (valid 10 years):"
openssl x509 -in "$OUTPUT_DIR/bootstrap-ca.crt" -noout -subject -dates

# Generate agent bootstrap key
openssl ecparam -name prime256v1 -genkey -noout -out "$OUTPUT_DIR/bootstrap-agent.key"

# Generate agent certificate signing request
openssl req -new \
    -key "$OUTPUT_DIR/bootstrap-agent.key" \
    -out "$OUTPUT_DIR/bootstrap-agent.csr" \
    -subj "/CN=SPIRE Agent Bootstrap/O=ProtocolSoup/C=AU"

# Sign agent certificate with bootstrap CA (valid for 10 years)
openssl x509 -req -sha256 -days 3650 \
    -in "$OUTPUT_DIR/bootstrap-agent.csr" \
    -CA "$OUTPUT_DIR/bootstrap-ca.crt" \
    -CAkey "$OUTPUT_DIR/bootstrap-ca.key" \
    -CAcreateserial \
    -out "$OUTPUT_DIR/bootstrap-agent.crt" \
    -extfile <(echo "basicConstraints=CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=clientAuth")

echo "Generated agent bootstrap certificate (valid 10 years):"
openssl x509 -in "$OUTPUT_DIR/bootstrap-agent.crt" -noout -subject -dates

# Cleanup CSR
rm -f "$OUTPUT_DIR/bootstrap-agent.csr" "$OUTPUT_DIR/bootstrap-ca.srl"

echo ""
echo "Files generated:"
echo "  - bootstrap-ca.crt     (CA cert for SPIRE Server)"
echo "  - bootstrap-ca.key     (CA key - keep secure!)"
echo "  - bootstrap-agent.crt  (Agent cert - store in Fly secrets)"
echo "  - bootstrap-agent.key  (Agent key - store in Fly secrets)"
echo ""
echo "Next steps:"
echo "  1. Copy bootstrap-ca.crt to SPIRE Server config directory"
echo "  2. Store bootstrap-agent.crt and bootstrap-agent.key as Fly secrets:"
echo "     fly secrets set BOOTSTRAP_AGENT_CERT=\$(cat bootstrap-agent.crt) -a protocolsoup"
echo "     fly secrets set BOOTSTRAP_AGENT_KEY=\$(cat bootstrap-agent.key) -a protocolsoup"

