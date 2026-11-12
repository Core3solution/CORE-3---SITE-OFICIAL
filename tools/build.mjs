// Builds ../site from the Claude Design export in ../project.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..'), src = path.join(root, 'project'), out = path.join(root, 'site');
fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(src, 'assets'), path.join(out, 'assets'), { recursive: true });
fs.rmSync(path.join(out, 'assets', '_sheet.png'), { force: true });
fs.copyFileSync(path.join(import.meta.dirname, 'dc-lite.js'), path.join(out, 'dc-lite.js'));

const parts = {};
for (const name of ['CORE 3 Home', 'GlassCube', 'ChromeKnot']) {
  const t = fs.readFileSync(path.join(src, name + '.dc.html'), 'utf8');
  const a = t.indexOf('<x-dc>') + 6, b = t.lastIndexOf('</x-dc>');
  let tpl = t.slice(a, b);
  const sm = /<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/.exec(t);
  const hm = /<helmet>([\s\S]*?)<\/helmet>/.exec(tpl);
  if (hm) { parts.helmet = hm[1]; tpl = tpl.replace(hm[0], ''); }
  parts[name] = { tpl, js: sm[1] };
}
let js = '';
for (const [key, reg] of [['CORE 3 Home', 'Home'], ['GlassCube', 'GlassCube'], ['ChromeKnot', 'ChromeKnot']]) {
  js += `DC.register(${JSON.stringify(reg)}, ${JSON.stringify(parts[key].tpl)}, function (DCLogic, React) {\n${parts[key].js}\nreturn Component;\n});\n`;
}
js += `DC.mount('Home', document.getElementById('app'));\n`;
fs.writeFileSync(path.join(out, 'app.js'), js);

const helmet = parts.helmet.replace(/<title>[\s\S]*?<\/title>\s*/, '').replace(/<meta name="viewport"[^>]*>\s*/, '');
const title = /<title>[\s\S]*?<\/title>/.exec(parts.helmet)[0];
fs.writeFileSync(path.join(out, 'index.html'), `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${title}
<meta name="description" content="Sites, automações, inteligência artificial e um sistema completo para organizar, atender, vender e crescer.">
<link rel="icon" href="assets/c3-symbol.png">
${helmet}<style>#app{overflow-x:clip}</style>
</head>
<body>
<div id="app"></div>
<noscript>Ative o JavaScript para ver o site da CORE 3.</noscript>
<script src="dc-lite.js"></script>
<script src="app.js"></script>
</body>
</html>
`);
console.log('built', out);
