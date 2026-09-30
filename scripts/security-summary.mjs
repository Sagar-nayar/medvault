// squashes all the security scan outputs into one table + markdown file
// so you dont have to dig through 5 json files to see what got found
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const dir = 'reports/security';
const read = f => (existsSync(`${dir}/${f}`) ? JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) : null);
const count = (list, key = 'Severity') =>
  list.reduce((acc, item) => ({ ...acc, [item[key]]: (acc[item[key]] || 0) + 1 }), {});

const rows = [];

const audit = read('npm-audit.json');
if (audit?.metadata) {
  const v = audit.metadata.vulnerabilities;
  rows.push({ tool: 'npm audit (deps)', CRITICAL: v.critical, HIGH: v.high, MEDIUM: v.moderate, LOW: v.low });
}

const semgrep = read('semgrep.json');
if (semgrep) {
  const bySev = count(semgrep.results.map(r => ({ Severity: r.extra.severity })));
  rows.push({ tool: 'Semgrep (SAST)', CRITICAL: 0, HIGH: bySev.ERROR || 0, MEDIUM: bySev.WARNING || 0, LOW: bySev.INFO || 0 });
}

for (const [file, label, field] of [
  ['trivy-config.json', 'Trivy (Dockerfile)', 'Misconfigurations'],
  ['trivy-fs.json', 'Trivy (repo + secrets)', 'Vulnerabilities'],
  ['trivy-image.json', 'Trivy (image)', 'Vulnerabilities'],
]) {
  const report = read(file);
  if (!report) continue;
  const all = (report.Results || []).flatMap(r => [...(r[field] || []), ...(r.Secrets || [])]);
  const c = count(all);
  rows.push({ tool: label, CRITICAL: c.CRITICAL || 0, HIGH: c.HIGH || 0, MEDIUM: c.MEDIUM || 0, LOW: c.LOW || 0 });
}

console.log('\n=== security summary ===');
console.table(rows);

mkdirSync(dir, { recursive: true });
const md = ['| Tool | Critical | High | Medium | Low |', '|---|---|---|---|---|',
  ...rows.map(r => `| ${r.tool} | ${r.CRITICAL} | ${r.HIGH} | ${r.MEDIUM} | ${r.LOW} |`)].join('\n');
writeFileSync(`${dir}/summary.md`, `# Security summary\n\n${md}\n`);
writeFileSync(`${dir}/summary.html`,
  `<html><body style="font-family:sans-serif"><h1>Security summary</h1><table border="1" cellpadding="6">` +
  `<tr><th>Tool</th><th>Critical</th><th>High</th><th>Medium</th><th>Low</th></tr>` +
  rows.map(r => `<tr><td>${r.tool}</td><td>${r.CRITICAL}</td><td>${r.HIGH}</td><td>${r.MEDIUM}</td><td>${r.LOW}</td></tr>`).join('') +
  `</table><p>Full JSON/SARIF reports are in the build artifacts.</p></body></html>`);
