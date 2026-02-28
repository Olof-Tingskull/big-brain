import http from "node:http";
import { db, end } from "../lib/db.js";
import { chunks, subjects, chunkSubjects } from "../lib/schema.js";

const PORT = 4444;

async function fetchGraphData() {
  const allChunks = await db
    .select({ id: chunks.id, content: chunks.content })
    .from(chunks);

  const allSubjects = await db
    .select({ id: subjects.id, name: subjects.name, type: subjects.type, summary: subjects.summary })
    .from(subjects);

  const allEdges = await db
    .select({
      chunkId: chunkSubjects.chunkId,
      subjectId: chunkSubjects.subjectId,
    })
    .from(chunkSubjects);

  return { chunks: allChunks, subjects: allSubjects, edges: allEdges };
}

function chunkLabel(content: string): string {
  const first = content.split("\n")[0].slice(0, 25);
  return first.length < content.length ? first + "…" : first;
}

function buildHtml(data: Awaited<ReturnType<typeof fetchGraphData>>): string {
  const nodes: object[] = [];

  for (const s of data.subjects) {
    nodes.push({
      data: {
        id: `s-${s.id}`,
        label: s.name,
        type: "subject",
        subjectType: s.type,
        fullText: s.summary || "",
      },
    });
  }

  for (const c of data.chunks) {
    nodes.push({
      data: {
        id: `c-${c.id}`,
        label: chunkLabel(c.content),
        type: "chunk",
        fullText: c.content,
      },
    });
  }

  const edges = data.edges.map((e, i) => ({
    data: {
      id: `e-${i}`,
      source: `c-${e.chunkId}`,
      target: `s-${e.subjectId}`,
    },
  }));

  const graphJson = JSON.stringify({ nodes, edges });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Big Brain – Knowledge Graph</title>
  <script src="https://unpkg.com/cytoscape@3/dist/cytoscape.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0; }
    #cy { width: 100vw; height: 100vh; }
    #info {
      position: fixed; top: 16px; left: 16px;
      background: rgba(15, 23, 42, 0.95); border: 1px solid #334155;
      border-radius: 8px; padding: 14px 18px; max-width: 420px;
      max-height: 50vh; overflow-y: auto;
      font-size: 13px; z-index: 10; pointer-events: auto;
    }
    #info h2 { font-size: 15px; margin-bottom: 4px; color: #38bdf8; }
    #info .type-badge {
      display: inline-block; font-size: 11px; color: #94a3b8;
      background: #1e293b; border-radius: 4px; padding: 2px 8px;
      margin-bottom: 8px;
    }
    #info .body { color: #cbd5e1; white-space: pre-wrap; line-height: 1.5; }
    #info .stats { color: #94a3b8; }
  </style>
</head>
<body>
  <div id="info">
    <h2>Big Brain – Knowledge Graph</h2>
    <div class="stats">${data.subjects.length} subjects · ${data.chunks.length} chunks · ${data.edges.length} edges</div>
  </div>
  <div id="cy"></div>
  <script>
    const graph = ${graphJson};
    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: [...graph.nodes, ...graph.edges],
      style: [
        {
          selector: 'node[type="subject"]',
          style: {
            'background-color': '#8b5cf6',
            'label': 'data(label)',
            'color': '#e2e8f0',
            'text-outline-color': '#0f172a',
            'text-outline-width': 2,
            'font-size': '8px',
            'width': 18,
            'height': 18,
            'text-valign': 'bottom',
            'text-margin-y': 6,
          }
        },
        {
          selector: 'node[type="chunk"]',
          style: {
            'background-color': '#0ea5e9',
            'label': 'data(label)',
            'color': '#cbd5e1',
            'text-outline-color': '#0f172a',
            'text-outline-width': 1.5,
            'font-size': '6px',
            'width': 10,
            'height': 10,
            'text-valign': 'bottom',
            'text-margin-y': 4,
            'text-max-width': '120px',
            'text-wrap': 'ellipsis',
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 0.8,
            'line-color': '#334155',
            'target-arrow-color': '#334155',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6,
          }
        },
        {
          selector: 'node:active',
          style: { 'overlay-opacity': 0 }
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#facc15',
          }
        }
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 1000,
        nodeRepulsion: function() { return 8000; },
        idealEdgeLength: function() { return 120; },
        gravity: 0.3,
        padding: 60,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // Make nodes grabbable (draggable)
    cy.nodes().grabbable(true);

    function esc(s) {
      const el = document.createElement('span');
      el.textContent = s;
      return el.innerHTML;
    }

    // Click to show full content
    cy.on('tap', 'node', function(evt) {
      const d = evt.target.data();
      const info = document.getElementById('info');
      if (d.type === 'subject') {
        info.innerHTML = '<h2>' + esc(d.label) + '</h2>'
          + '<div class="type-badge">Subject · ' + esc(d.subjectType) + '</div>'
          + (d.fullText ? '<div class="body">' + esc(d.fullText) + '</div>' : '<div class="body" style="color:#64748b">No summary</div>');
      } else {
        info.innerHTML = '<h2>Chunk</h2>'
          + '<div class="type-badge">Chunk</div>'
          + '<div class="body">' + esc(d.fullText) + '</div>';
      }
    });

    // Click background to reset
    cy.on('tap', function(evt) {
      if (evt.target === cy) {
        document.getElementById('info').innerHTML =
          '<h2>Big Brain – Knowledge Graph</h2>'
          + '<div class="stats">${data.subjects.length} subjects · ${data.chunks.length} chunks · ${data.edges.length} edges</div>';
      }
    });
  </script>
</body>
</html>`;
}

const server = http.createServer(async (_req, res) => {
  try {
    const data = await fetchGraphData();
    const html = buildHtml(data);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`🧠 Graph server running at http://localhost:${PORT}`);
});

process.on("SIGINT", async () => {
  console.log("\nShutting down…");
  server.close();
  await end();
  process.exit(0);
});
