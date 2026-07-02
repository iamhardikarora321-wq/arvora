# 🏙️ Arvora — Radix Tree Autocomplete Engine & Developer Hub

> A high-performance, browser-based **Radix Tree Autocomplete Engine** built entirely in vanilla JavaScript — featuring a live tree visualizer, database seed exporter, and an Indian city spelling game.

🌐 **Live Site:** [hardik-arora.github.io/arvora](https://hardik-arora.github.io/arvora)

---

## ✨ Features

### 🔍 Tab 1 — Autocomplete Engine
- Instant prefix search across **15,000 Indian cities** (GeoNames dataset)
- Sub-millisecond lookups using a custom **Radix Tree (Compressed Trie)**
- Live **benchmark bar** showing lookup speed vs a 5ms constraint
- **10,000-query stress test** with ops/second throughput display
- **Interactive Radix Tree Visualizer** — drag, zoom, and explore the tree structure
  - **Playground Mode**: Insert custom words and watch the tree split & compress edges in real time
  - **Search Mode**: Visualize the traversal path for any prefix query

### 💻 Tab 2 — Database Seed Exporter
A developer tool to generate ready-to-use database seeding code:
- **Autocomplete city search** to manually add specific cities
- **Filter by State** — Maharashtra, Delhi, UP, Karnataka, and more
- **Filter by naming suffix** — e.g. `pur`, `abad`, `nagar`, `garh`
- **Export formats**: JSON Array, PostgreSQL, MySQL, CSV
- **Copy to clipboard** or **Download** the generated file

### 🎮 Tab 3 — Geoguess Spelling Game
- A **scrambled city name** appears — unscramble it!
- Progressive **letter clue reveals**
- **Autocomplete-assisted guessing** — search for valid city spellings as hints
- Score, streak & best streak tracked with **localStorage** (persists between visits)

---

## 📊 Technical Highlights

| Metric | Value |
|--------|-------|
| Dataset | 15,000 GeoNames Indian cities |
| Engine | Radix Tree (Compressed Trie) |
| Lookup Speed | < 1ms average |
| Node Reduction | ~70% fewer nodes vs Standard Trie |
| Language | Vanilla JavaScript (ES6+) |
| Styling | Vanilla CSS with glassmorphism |
| Dependencies | **Zero** — no libraries or frameworks |

---

## 🧠 How the Radix Tree Works

A standard **Trie** stores one character per node. A **Radix Tree** compresses chains of single-child nodes into a single edge with multiple characters — drastically reducing memory usage.

```
Standard Trie for "mumbai", "mum", "mumble":         Radix Tree (compressed):
root → m → u → m → [end]                            root → mum → [end]
                 → b → a → i → [end]                             → bai → [end]
                 → b → l → e → [end]                             → ble → [end]
```

**Result:** 70%+ fewer nodes, faster cache locality, same O(L) search complexity.

---

## 📂 Project Structure

```
arvora/
├── index.html      # Main HTML — 3 tab layout
├── index.css       # Dark glassmorphism UI, fully responsive
├── app.js          # All logic: autocomplete, game, exporter, visualizer
├── trie.js         # RadixTrie & StandardTrie implementations
├── cities.js       # 15,000 Indian city strings (GeoNames dataset)
└── README.md       # This file
```

---

## 🗄️ Dataset Pipeline

The city database was prepared from the raw **GeoNames** `IN.zip` dataset:

1. **Download & Extract** — Fetched `IN.txt` containing all Indian geographical features
2. **Populated Place Filter** — Kept only class `P` records (cities & towns), removed lakes, monuments, administrative regions
3. **Heuristic Sorting** — Prioritized state & national capitals, then sorted by descending population
4. **Clean & Deduplicate** — Normalized to lowercase, collapsed spaces, removed punctuation, extracted top 15,000 unique names

---

## 🚀 Run Locally

No build step required — it's a static site!

```bash
git clone https://github.com/hardik-arora/arvora.git
cd arvora
python3 -m http.server 8080
# Open http://localhost:8080
```

---

## 👥 Arvora

Built with ❤️ for academic demonstration and benchmarking purposes.

---

## 📄 License

MIT License — free to use, modify, and distribute.
