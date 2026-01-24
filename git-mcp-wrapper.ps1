# Git MCP Server Wrapper for Cursor
# This script automatically detects the current directory and starts the Git MCP server

param(
    [string]$Repository = $null
)

# If no repository specified, use current directory
if (-not $Repository) {
    $Repository = Get-Location
}

# Check if it's a git repository
if (-not (Test-Path (Join-Path $Repository ".git"))) {
    Write-Error "Not a git repository: $Repository"
    exit 1
}

# Start the Git MCP server with the detected repository
npx -y @cyanheads/git-mcp-server --repository $Repository