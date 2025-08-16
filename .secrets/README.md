# Secrets Directory

This directory is for storing local secret files that should never be committed to git.

## DataDog API Key Storage

You can store your DataDog API key in any of these files:

```bash
# Option 1: Plain text file
echo "your_api_key_here" > datadog-api-key

# Option 2: Alternative filename
echo "your_api_key_here" > dd-api-key.txt
```

## Security Notes

- ✅ All files in this directory are automatically git-ignored
- ✅ Files should contain only the API key (no extra whitespace)
- ✅ Use restrictive file permissions: `chmod 600 datadog-api-key`
- ❌ Never commit secret files to version control
- ❌ Never share secret files in chat or email

## Alternative Storage Locations

The system also checks these locations (in order):

1. **GitHub Secrets**: `DD_API_KEY_SECRET` (recommended for CI/CD)
2. **Environment Variable**: `DD_API_KEY`
3. **Local Secret Files**:
   - `e2e-tests/.secrets/datadog-api-key`
   - `e2e-tests/.secrets/dd-api-key.txt`
   - `~/.datadog/api-key`
   - `/etc/datadog/api-key`
4. **Base64 Encoded**: `DD_API_KEY_B64` environment variable

## Usage

Once you've stored your API key using any method above:

```bash
# Test DataDog connection
npm run datadog:test

# Run tests with DataDog monitoring
npm run test:datadog
```