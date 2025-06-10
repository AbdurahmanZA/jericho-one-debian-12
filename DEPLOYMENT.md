
# Automatic Deployment Setup

This project uses GitHub Actions for automatic deployment to your FreePBX server.

## Prerequisites

1. A server running FreePBX with Apache/Nginx
2. SSH access to your server
3. Node.js installed on your server
4. Your project cloned on the server

## Setup Instructions

### 1. Server Setup

On your FreePBX server, ensure you have the project directory:

```bash
# Clone the project (if not already done)
cd /opt
sudo git clone https://github.com/AbdurahmanZA/freepbx-crm-fusion.git
sudo chown -R $USER:$USER freepbx-crm-fusion
cd freepbx-crm-fusion

# Install dependencies
npm install

# Create initial build
npm run build
sudo cp -r dist/* /var/www/html/
```

### 2. SSH Key Setup

Generate an SSH key pair for GitHub Actions:

```bash
# On your local machine or server
ssh-keygen -t rsa -b 4096 -f github-actions-key
```

Add the public key to your server's authorized_keys:

```bash
# On your server
cat github-actions-key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 3. GitHub Secrets Configuration

In your GitHub repository (https://github.com/AbdurahmanZA/freepbx-crm-fusion):

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add these repository secrets:

   - `HOST`: Your server's IP address or domain name
   - `USERNAME`: Your server username (usually root or the user you SSH as)
   - `PRIVATE_KEY`: Contents of the private key file (github-actions-key)

### 4. Update Deployment Path

Edit `.github/workflows/deploy.yml` and update this line:
```yaml
cd /path/to/your/freepbx-crm-fusion
```

Replace with your actual path, for example:
```yaml
cd /opt/freepbx-crm-fusion
```

## How It Works

1. **On Push to Main**: Automatically builds and deploys to production server
2. **On Pull Request**: Only builds and tests (no deployment)
3. **Build Process**: Installs dependencies, runs build, copies files to web root
4. **Server Update**: Pulls latest code, rebuilds, and reloads Apache

## Manual Deployment

If you need to deploy manually:

```bash
# On your server
cd /opt/freepbx-crm-fusion
git pull origin main
npm ci --only=production
npm run build
sudo cp -r dist/* /var/www/html/
sudo systemctl reload apache2
```

## Troubleshooting

### Common Issues:

1. **Permission denied**: Ensure SSH key is correctly added to server
2. **Build fails**: Check Node.js version compatibility
3. **Files not copying**: Verify web root path (/var/www/html/)
4. **Service restart fails**: Ensure user has sudo privileges

### Checking Deployment Status:

- Go to your GitHub repository → **Actions** tab
- View the latest workflow run for deployment status
- Check server logs: `sudo tail -f /var/log/apache2/error.log`

## Security Notes

- Never commit private keys to the repository
- Use GitHub Secrets for all sensitive information
- Regularly rotate SSH keys
- Monitor deployment logs for security issues
