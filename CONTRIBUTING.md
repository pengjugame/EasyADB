# Contributing to EasyADB

Thank you for your interest in contributing to EasyADB! We welcome contributions from the community.

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with the following information:

1. **Description**: Clear description of the bug
2. **Steps to Reproduce**: Detailed steps to reproduce the issue
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**:
   - OS: (Windows/macOS/Linux)
   - Node.js version
   - ADB version
   - Device model

### Suggesting Features

We love new ideas! To suggest a feature:

1. Check if the feature has already been requested
2. Create an issue with the "enhancement" label
3. Describe the feature and its use case
4. Explain why this feature would be useful

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/pengjugame/EasyADB.git
   cd EasyADB
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Test your changes thoroughly

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues
   - Include screenshots if applicable

## Development Guidelines

### Code Style

- Use **async/await** for asynchronous operations
- Use **meaningful variable names**
- Add **comments** for complex logic
- Keep functions **focused and small**
- Use **chalk** for colored output
- Use **inquirer** for user interactions

### Example Code Style

```javascript
// Good: Clear function name and async/await
async function exportFiles(files) {
    if (files.length === 0) {
        console.log(chalk.yellow('No files to export'));
        return;
    }

    console.log(chalk.green(`\nExporting ${files.length} files...`));

    for (const file of files) {
        await exportSingleFile(file);
    }
}

// Bad: Unclear name and callback hell
function doStuff(f, cb) {
    if (f.length === 0) return;
    f.forEach(x => {
        someFunc(x, () => {
            anotherFunc(() => {
                cb();
            });
        });
    });
}
```

### Safety Guidelines

- **Always confirm destructive operations** (delete, overwrite)
- **Validate user input** before executing commands
- **Show progress** for long-running operations
- **Handle errors gracefully** with clear messages
- **Verify operations** after completion

### Testing

Before submitting a PR:

1. Test on your target platform (Windows/macOS/Linux)
2. Test with different Android devices if possible
3. Test edge cases (empty directories, special characters, etc.)
4. Ensure no regression in existing features

## Project Structure

```
EasyADB/
├── src/                    # Source code
│   ├── quest-video.js      # Quest video manager
│   ├── adb-manager.js      # Universal ADB manager
│   └── AdbFileManager/     # Config and resources
├── doc/                    # Documentation
├── exe/                    # Build outputs
└── README.md               # Main documentation
```

## Adding New Features

### 1. File Operations

Use the existing `adbShell()` function:

```javascript
function adbShell(shellCommand, silent = false) {
    const cmd = `${ADB_PATH} shell ${shellCommand}`;
    try {
        const result = execSync(cmd, {
            encoding: 'utf-8',
            maxBuffer: 50 * 1024 * 1024,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        return result.trim();
    } catch (error) {
        if (!silent) {
            console.error(chalk.red(`ADB Shell failed: ${error.message}`));
        }
        return null;
    }
}
```

### 2. User Interactions

Use `inquirer` for menus and prompts:

```javascript
const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: 'What would you like to do?',
    choices: [
        { name: '📤 Export files', value: 'export' },
        { name: '🗑️  Delete files', value: 'delete' },
        { name: '↩️  Exit', value: 'exit' }
    ]
}]);
```

### 3. Display Information

Use `cli-table3` for tables:

```javascript
const table = new Table({
    head: ['Date', 'File Name', 'Size'],
    colWidths: [15, 40, 15]
});

files.forEach(f => {
    table.push([f.date, f.fileName, f.sizeFormatted]);
});

console.log(table.toString());
```

## Documentation

When adding features:

1. Update relevant documentation in `doc/`
2. Add usage examples
3. Update the changelog
4. Add comments in code for complex logic

## Community Guidelines

- Be respectful and constructive
- Help others in issues and discussions
- Share your use cases and feedback
- Report bugs and suggest improvements

## Questions?

If you have questions about contributing:

1. Check existing issues and discussions
2. Read the documentation in `doc/`
3. Create a new issue with the "question" label

## License

By contributing to EasyADB, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to EasyADB! 🎉
