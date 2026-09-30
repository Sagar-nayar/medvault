// custom quality gate on top of SonarCloud
// sonarcloud free plan only lets you use the default "Sonar way" gate, so this script
// pulls the numbers from the sonarcloud api and checks them against quality-gate.json.
// it also prints the last few analyses so you can see the trend over time.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const HOST  = process.env.SONAR_HOST_URL || 'https://sonarcloud.io';
const TOKEN = process.env.SONAR_TOKEN;
const props = readFileSync('sonar-project.properties', 'utf8');
const KEY   = props.match(/^sonar\.projectKey=(.+)$/m)[1].trim();
const gate  = JSON.parse(readFileSync('quality-gate.json', 'utf8'));
const auth  = { Authorization: `Bearer ${TOKEN}` };

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function api(path) {
  const res = await fetch(`${HOST}${path}`, { headers: auth });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

// sonar processes the upload in the background, so wait for that task to finish first
async function waitForAnalysis() {
  const file = '.scannerwork/report-task.txt';
  if (!existsSync(file)) return;
  const taskId = readFileSync(file, 'utf8').match(/^ceTaskId=(.+)$/m)?.[1];
  for (let i = 0; i < 60 && taskId; i++) {
    const { task } = await api(`/api/ce/task?id=${taskId}`);
    if (task.status === 'SUCCESS') return;
    if (['FAILED', 'CANCELED'].includes(task.status)) throw new Error(`analysis ${task.status}`);
    await sleep(5000);
  }
}

function passes(actual, { op, value }) {
  return op === '>=' ? actual >= value : actual <= value;
}

async function main() {
  await waitForAnalysis();
  const keys = [...Object.keys(gate.thresholds), ...gate.tracked].join(',');
  const { component } = await api(`/api/measures/component?component=${KEY}&metricKeys=${keys}`);
  const measures = Object.fromEntries(component.measures.map(m => [m.metric, Number(m.value)]));

  const rows = Object.entries(gate.thresholds).map(([metric, rule]) => {
    const actual = measures[metric] ?? 0;
    return { metric, actual, rule: `${rule.op} ${rule.value}`, result: passes(actual, rule) ? 'PASS' : 'FAIL' };
  });
  console.log('\n=== MedVault custom quality gate ===');
  console.table(rows);
  console.log('tracked (not gated):', gate.tracked.map(k => `${k}=${measures[k] ?? 'n/a'}`).join('  '));

  // sonar's own gate, just for info
  const { projectStatus } = await api(`/api/qualitygates/project_status?projectKey=${KEY}`);
  console.log(`SonarCloud "Sonar way" gate: ${projectStatus.status}`);

  // trend: last 5 analyses for the important numbers
  const history = await api(`/api/measures/search_history?component=${KEY}&metrics=coverage,code_smells,duplicated_lines_density&ps=5`);
  console.log('\n=== trend (last 5 analyses) ===');
  for (const m of history.measures) {
    console.log(`${m.metric.padEnd(26)} ${m.history.map(h => h.value ?? '-').join('  ->  ')}`);
  }

  mkdirSync('reports', { recursive: true });
  writeFileSync('reports/quality-gate.json', JSON.stringify({ measures, rows, sonarWay: projectStatus.status }, null, 2));

  const failed = rows.filter(r => r.result === 'FAIL');
  if (failed.length) {
    console.error(`\nquality gate FAILED on: ${failed.map(r => r.metric).join(', ')}`);
    process.exit(1);
  }
  console.log('\nquality gate PASSED');
}

main().catch(err => {
  console.error('quality gate error:', err.message);
  process.exit(1);
});
