const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const packageJson = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
);
const version = process.env.RELEASE_VERSION || packageJson.version;
const outputDirectory = path.join(__dirname, '..', 'release-notes');
const outputPath = path.join(outputDirectory, `v${version}.md`);

function git(args) {
  try {
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const currentTag = `v${version}`;
const previousTag = git(['tag', '--list', 'v*', '--sort=-version:refname'])
  .split('\n')
  .find((tag) => tag && tag !== currentTag);
const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';
const commits = git(['log', range, '--pretty=format:- %s (`%h`)']).split('\n').filter(Boolean);
const commitList = commits.length > 0 ? commits.join('\n') : '- Maintenance release';
const sha = process.env.GITHUB_SHA || git(['rev-parse', '--short', 'HEAD']);

const notes = `# Slow Roads v${version}\n\nAutomated release for commit \\`${sha}\\`.\n\n## Changes\n\n${commitList}\n`;
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputPath, notes);
console.log(`Generated ${outputPath}`);
