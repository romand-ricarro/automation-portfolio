import os
import re
import subprocess
from version import __version__

def update_version(new_version):
    with open('version.py', 'r') as file:
        content = file.read()
    
    content = re.sub(r'__version__ = "[^"]+"', f'__version__ = "{new_version}"', content)
    
    with open('version.py', 'w') as file:
        file.write(content)

def create_release_notes():
    # Get all commits since last tag
    result = subprocess.run(
        ['git', 'log', '--pretty=format:%s', f'v{__version__}..HEAD'], 
        capture_output=True, text=True
    )
    commits = result.stdout.strip().split('\n')
    
    # Categorize commits
    features = []
    fixes = []
    other = []
    
    for commit in commits:
        if commit.startswith('feat:'):
            features.append(f"- {commit[5:].strip()}")
        elif commit.startswith('fix:'):
            fixes.append(f"- {commit[4:].strip()}")
        else:
            other.append(f"- {commit}")
    
    # Create release notes
    notes = []
    if features:
        notes.append("## ✨ New Features\n")
        notes.extend(features)
        notes.append("")
    
    if fixes:
        notes.append("## 🐛 Bug Fixes\n")
        notes.extend(fixes)
        notes.append("")
    
    if other:
        notes.append("## 🔧 Other Changes\n")
        notes.extend(other)
    
    return "\n".join(notes)

def bump_version(version_type='patch'):
    # Parse current version
    major, minor, patch = map(int, __version__.split('.'))
    
    # Bump version
    if version_type == 'major':
        major += 1
        minor = 0
        patch = 0
    elif version_type == 'minor':
        minor += 1
        patch = 0
    else:  # patch
        patch += 1
    
    new_version = f"{major}.{minor}.{patch}"
    return new_version

def main():
    # Ask for version type
    print(f"Current version: {__version__}")
    print("What kind of release is this?")
    print("1. Patch (bug fixes)")
    print("2. Minor (new features)")
    print("3. Major (breaking changes)")
    
    choice = input("Enter choice (1-3): ")
    version_type = {
        '1': 'patch',
        '2': 'minor',
        '3': 'major'
    }.get(choice, 'patch')
    
    # Bump version
    new_version = bump_version(version_type)
    print(f"New version will be: {new_version}")
    
    # Update version file
    update_version(new_version)
    
    # Commit the version change
    subprocess.run(['git', 'add', 'version.py'])
    subprocess.run(['git', 'commit', '-m', f'chore: bump version to {new_version}'])
    
    # Create release notes
    release_notes = create_release_notes()
    
    # Create and push tag
    subprocess.run(['git', 'tag', f'v{new_version}'])
    subprocess.run(['git', 'push', 'origin', 'main'])
    subprocess.run(['git', 'push', 'origin', f'v{new_version}'])
    
    # Create GitHub release
    with open('release_notes.md', 'w') as f:
        f.write(f"# Harry Botter v{new_version} 🧙‍♂️\n\n")
        f.write(release_notes)
    
    subprocess.run([
        'gh', 'release', 'create', f'v{new_version}',
        '--title', f'Harry Botter v{new_version}',
        '--notes-file', 'release_notes.md'
    ])
    
    # Clean up
    os.remove('release_notes.md')
    
    print(f"✅ Released v{new_version} successfully!")

if __name__ == "__main__":
    main()