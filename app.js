/**
 * app.js
 * App controller, interactive particle system, sound synthesizer, SVG visualizers, 
 * database seed exporter tool, and Geoguess spelling game.
 */

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE VARIABLES ---
  let radixTrie = new RadixTrie();
  let standardTrie = new StandardTrie();
  let playgroundTrie = new RadixTrie();

  // Active view states
  let activeTab = 'engine'; // 'engine', 'routes', 'game'
  let visualizerMode = 'playground'; // 'playground', 'search'
  
  // Drag and zoom variables for SVG canvas
  let isDragging = false;
  let startX = 0, startY = 0;
  let translateX = 60, translateY = 80;
  let scale = 0.95;

  // Sound settings
  let soundEnabled = true;
  let audioCtx = null;

  // Game Arena States
  let gameScore = 0;
  let gameStreak = 0;
  let gameBestStreak = 0;
  let gameCurrentCity = "";
  let gameCluesRevealed = 0;

  // Manual Basket for Seed Exporter
  const selectedBasket = [];

  // Cache DOM elements
  const searchInput = document.getElementById("city-search");
  const clearSearch = document.getElementById("clear-search");
  const dropdown = document.getElementById("suggestions-dropdown");
  const suggestionsList = document.getElementById("suggestions-list");
  const suggestionsMetrics = document.getElementById("suggestions-metrics");
  
  const statCitiesCount = document.getElementById("stat-cities-count");
  const statBuildTime = document.getElementById("stat-build-time");
  const statNodeReduction = document.getElementById("stat-node-reduction");
  const statLookupTime = document.getElementById("stat-lookup-time");

  const benchmarkStatus = document.getElementById("benchmark-status");
  const benchmarkBar = document.getElementById("benchmark-bar");
  const benchmarkExactTime = document.getElementById("benchmark-exact-time");

  const treeSvg = document.getElementById("tree-svg");
  const playgroundFormContainer = document.getElementById("playground-form-container");
  const playgroundInput = document.getElementById("playground-input");
  const btnInsertPlayground = document.getElementById("playground-btn-insert");
  const btnResetPlayground = document.getElementById("playground-btn-reset");
  
  const btnModePlayground = document.getElementById("btn-mode-playground");
  const btnModeSearch = document.getElementById("btn-mode-search");
  const visualizerDescription = document.getElementById("visualizer-description");
  const fileUpload = document.getElementById("file-upload");
  const audioToggleBtn = document.getElementById("audio-toggle-btn");

  const btnStressTest = document.getElementById("btn-stress-test");
  const stressTestStatus = document.getElementById("stress-test-status");
  const stressStatsDisplay = document.getElementById("stress-stats-display");
  const stressAvgSpeed = document.getElementById("stress-avg-speed");
  const stressThroughput = document.getElementById("stress-throughput");

  // Tab buttons and containers
  const tabBtnEngine = document.getElementById("tab-btn-engine");
  const tabBtnRoutes = document.getElementById("tab-btn-routes");
  const tabBtnGame = document.getElementById("tab-btn-game");
  const tabBtnPattern = document.getElementById("tab-btn-pattern");
  const tabBtnAnalytics = document.getElementById("tab-btn-analytics");
  const tabBtnScanner = document.getElementById("tab-btn-scanner");
  const tabContentEngine = document.getElementById("tab-content-engine");
  const tabContentRoutes = document.getElementById("tab-content-routes");
  const tabContentGame = document.getElementById("tab-content-game");
  const tabContentPattern = document.getElementById("tab-content-pattern");
  const tabContentAnalytics = document.getElementById("tab-content-analytics");
  const tabContentScanner = document.getElementById("tab-content-scanner");

  // Exporter DOM elements
  const routeDestination = document.getElementById("route-destination");
  const dropdownDestination = document.getElementById("dropdown-destination");
  const listDestination = document.getElementById("list-destination");
  const logisticsSuggestionsMetrics = document.getElementById("logistics-suggestions-metrics");
  const selectStateFilter = document.getElementById("export-state-filter");
  const selectFormat = document.getElementById("export-format");
  const inputNamePattern = document.getElementById("export-name-pattern");
  const inputExportLimit = document.getElementById("package-weight");
  
  const btnCalcRoute = document.getElementById("btn-calc-route"); // triggers seed schema gen
  const routeResultsCard = document.getElementById("route-results-card");
  const exportCodeBlock = document.getElementById("export-code-block");
  const btnCopySeed = document.getElementById("btn-copy-seed");
  const btnDownloadSeed = document.getElementById("btn-download-seed");

  // Game DOM elements
  const gameScrambledWord = document.getElementById("game-scrambled-word");
  const gameClueText = document.getElementById("game-clue-text");
  const gameGuessInput = document.getElementById("game-guess-input");
  const dropdownGame = document.getElementById("dropdown-game");
  const listGame = document.getElementById("list-game");
  const gameSuggestionsMetrics = document.getElementById("game-suggestions-metrics");
  const gameBtnSubmit = document.getElementById("game-btn-submit");
  const gameBtnSkip = document.getElementById("game-btn-skip");
  const gameBtnRevealClue = document.getElementById("game-btn-reveal-clue");
  const domGameScore = document.getElementById("game-score");
  const domGameStreak = document.getElementById("game-streak");
  const domGameBestStreak = document.getElementById("game-best-streak");
  const gameLog = document.getElementById("game-log");

  // SVG viewport group
  let svgViewport;
  
  // =====================================================================
  // AUDIO ENGINE (Web Audio API Synthesizer)
  // =====================================================================
  
  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playTone(freq, type, duration, volume, slideToFreq = 0) {
    if (!soundEnabled) return;
    try {
      initAudio();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      
      if (slideToFreq > 0) {
        osc.frequency.exponentialRampToValueAtTime(slideToFreq, audioCtx.currentTime + duration);
      }
      
      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("AudioContext failed to initialize or execute", e);
    }
  }

  function playHoverSound() {
    playTone(800, "sine", 0.04, 0.04);
  }

  function playSelectSound() {
    playTone(523.25, "triangle", 0.15, 0.15); // C5
    setTimeout(() => playTone(659.25, "triangle", 0.15, 0.15), 50); // E5
    setTimeout(() => playTone(783.99, "triangle", 0.3, 0.15), 100); // G5
  }

  function playSuccessSound() {
    playTone(600, "sine", 0.1, 0.15);
    setTimeout(() => playTone(900, "sine", 0.2, 0.15), 80);
  }

  function playErrorSound() {
    playTone(220, "sawtooth", 0.25, 0.1, 110);
  }

  function playStressTick(progress) {
    const baseFreq = 300 + progress * 600;
    playTone(baseFreq, "sine", 0.03, 0.03);
  }

  // =====================================================================
  // INTERACTIVE PARTICLE SYSTEM
  // =====================================================================
  
  const canvas = document.getElementById("particle-canvas");
  const ctx = canvas.getContext("2d");
  let particles = [];
  
  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  class Particle {
    constructor(x, y, color = null, isAmbient = false) {
      this.x = x;
      this.y = y;
      this.isAmbient = isAmbient;
      
      if (isAmbient) {
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 2 + 0.5;
        this.color = color || `rgba(6, 182, 212, ${Math.random() * 0.3 + 0.1})`;
        this.alpha = Math.random() * 0.5 + 0.2;
      } else {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.radius = Math.random() * 4 + 1.5;
        this.color = color || (Math.random() > 0.5 ? "rgba(6, 182, 212, 0.8)" : "rgba(168, 85, 247, 0.8)");
        this.alpha = 1.0;
        this.decay = Math.random() * 0.02 + 0.015;
      }
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      
      if (this.isAmbient) {
        if (this.x < 0) this.x = canvas.width;
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;
      } else {
        this.alpha -= this.decay;
      }
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
      
      if (!this.isAmbient && this.radius > 3) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function initAmbientParticles() {
    particles = [];
    const count = Math.floor((canvas.width * canvas.height) / 18000);
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        null,
        true
      ));
    }
  }
  initAmbientParticles();

  function spawnParticleBurst(x, y, count = 25, color = null) {
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(x, y, color, false));
    }
  }

  function animateParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles = particles.filter(p => {
      p.update();
      p.draw();
      return p.isAmbient || p.alpha > 0;
    });
    requestAnimationFrame(animateParticles);
  }
  requestAnimationFrame(animateParticles);

  document.addEventListener("click", (e) => {
    if (e.target.closest("button") || e.target.closest(".suggestion-item") || e.target.closest(".tab-btn")) {
      spawnParticleBurst(e.clientX, e.clientY, 15);
    }
  });

  // =====================================================================
  // INITIALIZATION
  // =====================================================================
  
  function initializeApp() {
    setupSvg();
    buildTries(CITIES_DATA);
    setupPlaygroundDefault();
    setupEventListeners();
    updateVisualizer();
    setupGameScoreboard();
    loadNewGameWord();
    
    // Generate initial schema query immediately
    setTimeout(generateDatabaseSeed, 20);
  }

  function setupSvg() {
    treeSvg.innerHTML = "";
    svgViewport = document.createElementNS("http://www.w3.org/2000/svg", "g");
    svgViewport.setAttribute("id", "viewport");
    treeSvg.appendChild(svgViewport);
    updateTransform();
  }

  function updateTransform() {
    svgViewport.setAttribute("transform", `translate(${translateX}, ${translateY}) scale(${scale})`);
  }

  function buildTries(citiesArray) {
    const t0 = performance.now();
    
    radixTrie = new RadixTrie();
    standardTrie = new StandardTrie();
    
    for (let i = 0; i < citiesArray.length; i++) {
      radixTrie.insert(citiesArray[i]);
      standardTrie.insert(citiesArray[i]);
    }
    
    const t1 = performance.now();
    const buildDurationMs = t1 - t0;

    const rtNodes = radixTrie.getNodeCount();
    const stNodes = standardTrie.getNodeCount();
    const rtChars = radixTrie.getEdgeCharacterCount();
    
    const stChars = Math.max(0, stNodes - 1);
    const nodeReductionPct = ((stNodes - rtNodes) / stNodes) * 100;

    statCitiesCount.textContent = citiesArray.length.toLocaleString();
    statBuildTime.textContent = `${buildDurationMs.toFixed(2)} ms`;
    statNodeReduction.textContent = `${nodeReductionPct.toFixed(1)}%`;
    
    document.getElementById("table-st-nodes").textContent = stNodes.toLocaleString();
    document.getElementById("table-rt-nodes").textContent = rtNodes.toLocaleString();
    document.getElementById("table-node-savings").textContent = `-${nodeReductionPct.toFixed(1)}%`;
    
    document.getElementById("table-st-chars").textContent = stChars.toLocaleString();
    document.getElementById("table-rt-chars").textContent = rtChars.toLocaleString();
    
    const charSavingsPct = ((stChars - rtChars) / stChars) * 100;
    document.getElementById("table-char-savings").textContent = `-${charSavingsPct.toFixed(1)}%`;
  }

  function setupPlaygroundDefault() {
    playgroundTrie = new RadixTrie();
    const defaultPlaygroundWords = ["car", "cart", "cat", "dog", "dodge", "do", "dark", "dart"];
    defaultPlaygroundWords.forEach(word => playgroundTrie.insert(word));
  }

  // =====================================================================
  // EVENT LISTENERS & TAB CONTROLS
  // =====================================================================
  
  function setupEventListeners() {
    // Sound FX enable toggler
    audioToggleBtn.addEventListener("click", () => {
      soundEnabled = !soundEnabled;
      if (soundEnabled) {
        initAudio();
        audioToggleBtn.innerHTML = "<span>🔊</span> Sounds: On";
        audioToggleBtn.style.color = "var(--color-primary)";
        audioToggleBtn.style.background = "rgba(59, 130, 246, 0.15)";
        playSuccessSound();
      } else {
        audioToggleBtn.innerHTML = "<span>🔇</span> Sounds: Off";
        audioToggleBtn.style.color = "var(--text-muted)";
        audioToggleBtn.style.background = "rgba(255, 255, 255, 0.03)";
      }
    });

    // --- Tab Navigation Handlers ---
    tabBtnEngine.addEventListener("click", () => switchTab('engine'));
    tabBtnRoutes.addEventListener("click", () => switchTab('routes'));
    tabBtnGame.addEventListener("click", () => switchTab('game'));
    tabBtnPattern.addEventListener("click", () => switchTab('pattern'));
    tabBtnAnalytics.addEventListener("click", () => switchTab('analytics'));
    tabBtnScanner.addEventListener("click", () => switchTab('scanner'));

    // --- Tab 1: Engine search input autocomplete handler ---
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length > 0) {
        clearSearch.style.display = "inline";
        handleAutocompleteInput(searchInput, dropdown, suggestionsList, suggestionsMetrics, query, 10, (selected) => {
          handleAutocomplete(selected);
        });
      } else {
        clearSearch.style.display = "none";
        hideSuggestions();
      }
    });

    clearSearch.addEventListener("click", () => {
      searchInput.value = "";
      clearSearch.style.display = "none";
      hideSuggestions();
      if (visualizerMode === 'search') {
        updateVisualizer();
      }
    });

    // Close all suggestions dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) hideSuggestions();
      if (!routeDestination.contains(e.target) && !dropdownDestination.contains(e.target)) dropdownDestination.classList.remove("active");
      if (!gameGuessInput.contains(e.target) && !dropdownGame.contains(e.target)) dropdownGame.classList.remove("active");
    });

    // Custom File Uploader logic (only if element exists)
    if (fileUpload) fileUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const text = evt.target.result;
        const parsedCities = text.split(/\r?\n/)
          .map(line => line.trim().toLowerCase().replace(/[^a-z ]/g, ''))
          .filter(line => line.length >= 3);
        
        if (parsedCities.length === 0) {
          playErrorSound();
          alert("Error: No valid words found in file.");
          return;
        }

        buildTries(parsedCities);
        searchInput.value = "";
        clearSearch.style.display = "none";
        hideSuggestions();
        if (visualizerMode === 'search') {
          updateVisualizer();
        }
        playSuccessSound();
        const rect = document.querySelector(".upload-area").getBoundingClientRect();
        spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 40, "var(--color-success)");
        alert(`Successfully loaded ${parsedCities.length.toLocaleString()} cities from custom file!`);
      };
      reader.readAsText(file);
    });

    // Mode toggles
    btnModePlayground.addEventListener("click", () => {
      visualizerMode = 'playground';
      btnModePlayground.classList.add("active");
      btnModeSearch.classList.remove("active");
      playgroundFormContainer.style.display = "flex";
      visualizerDescription.textContent = "Playground Mode: Insert custom strings to see how the Radix Tree splits and compresses edge labels.";
      resetPanZoomPlayground();
      updateVisualizer();
    });

    btnModeSearch.addEventListener("click", () => {
      visualizerMode = 'search';
      btnModePlayground.classList.remove("active");
      btnModeSearch.classList.add("active");
      playgroundFormContainer.style.display = "none";
      visualizerDescription.textContent = "Search Mode: Type in the search box to visualize the traversal path and nearest branch splits.";
      resetPanZoomSearch();
      updateVisualizer();
    });

    // Custom playground insert
    btnInsertPlayground.addEventListener("click", handlePlaygroundInsert);
    playgroundInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handlePlaygroundInsert();
    });

    btnResetPlayground.addEventListener("click", () => {
      setupPlaygroundDefault();
      playgroundInput.value = "";
      updateVisualizer();
      playSuccessSound();
    });

    btnStressTest.addEventListener("click", runStressTest);

    // SVG Dragging & Panning Tree Canvas
    treeSvg.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX - translateX;
      startY = e.clientY - translateY;
      treeSvg.style.cursor = "grabbing";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      translateX = e.clientX - startX;
      translateY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
      treeSvg.style.cursor = "grab";
    });

    treeSvg.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = 1.1;
      if (e.deltaY < 0) {
        scale = Math.min(scale * zoomFactor, 3.0);
      } else {
        scale = Math.max(scale / zoomFactor, 0.2);
      }
      updateTransform();
    });

    // --- Tab 2: Route Planner / Exporter Event Listeners ---
    setupRoutePlannerListeners();

    // --- Tab 3: Spelling Game Event Listeners ---
    setupGameListeners();
  }

  function switchTab(tabId) {
    if (activeTab === tabId) return;
    activeTab = tabId;
    initAudio();

    const allTabBtns = [tabBtnEngine, tabBtnRoutes, tabBtnGame, tabBtnPattern, tabBtnAnalytics, tabBtnScanner];
    const allTabContents = [tabContentEngine, tabContentRoutes, tabContentGame, tabContentPattern, tabContentAnalytics, tabContentScanner];
    const tabIds = ['engine', 'routes', 'game', 'pattern', 'analytics', 'scanner'];
    const idx = tabIds.indexOf(tabId);

    allTabBtns.forEach((btn, i) => btn.classList.toggle("active", i === idx));
    allTabContents.forEach((content, i) => {
      if (content) {
        content.classList.toggle("active", i === idx);
        content.style.display = (i === idx) ? '' : 'none';
      }
    });

    playSelectSound();
    
    // Generate schema on tab switch
    if (tabId === 'routes') {
      setTimeout(generateDatabaseSeed, 20);
    }
    // Render analytics lazily on first visit
    if (tabId === 'analytics') {
      renderAnalytics();
    }
  }

  // =====================================================================
  // UNIFIED AUTOCOMPLETE HANDLER FOR ALL INPUT FIELDS
  // =====================================================================
  
  function handleAutocompleteInput(inputElem, dropdownElem, listElem, metricsElem, query, limit, onSelectCallback) {
    const t0 = performance.now();
    const suggestions = radixTrie.autocomplete(query, limit);
    const t1 = performance.now();
    const durationMs = t1 - t0;

    // Update the main lookup speed metrics in the top dashboard
    statLookupTime.textContent = `${durationMs.toFixed(3)} ms`;

    // If it's Tab 1 (Main search input), update its custom benchmarking stats cards
    if (inputElem === searchInput) {
      benchmarkExactTime.textContent = `${(durationMs * 1000).toFixed(1)} μs (${durationMs.toFixed(4)} ms)`;
      const pct = Math.min((durationMs / 5.0) * 100, 100);
      benchmarkBar.style.width = `${pct}%`;
      if (durationMs < 5.0) {
        benchmarkStatus.textContent = "PASSED";
        benchmarkStatus.style.color = "var(--color-success)";
        benchmarkBar.style.background = "linear-gradient(90deg, var(--color-primary), var(--color-accent))";
      } else {
        benchmarkStatus.textContent = "FAILED";
        benchmarkStatus.style.color = "var(--color-purple)";
        benchmarkBar.style.background = "var(--color-purple)";
      }
    }

    // Populate drop-down list
    listElem.innerHTML = "";
    if (metricsElem) {
      metricsElem.textContent = `${suggestions.length} match${suggestions.length === 1 ? '' : 'es'}`;
    }

    if (suggestions.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.className = "suggestion-item";
      emptyLi.style.cursor = "default";
      emptyLi.innerHTML = `<span style="color: var(--text-muted)">No matches found</span>`;
      listElem.appendChild(emptyLi);
    } else {
      suggestions.forEach(item => {
        const li = document.createElement("li");
        li.className = "suggestion-item";
        
        let displayedHTML = item.startsWith(query) 
          ? `<span class="match">${query}</span>${item.slice(query.length)}`
          : item;

        li.innerHTML = `
          <span class="suggestion-text">${displayedHTML}</span>
          <span class="suggestion-arrow">➔</span>
        `;

        li.addEventListener("mouseenter", playHoverSound);
        li.addEventListener("click", () => {
          playSelectSound();
          inputElem.value = capitalizeWord(item); // Capitalize selected autocomplete result
          dropdownElem.classList.remove("active");
          onSelectCallback(item);
        });

        listElem.appendChild(li);
      });
    }
    dropdownElem.classList.add("active");
  }

  // Backwards compatible wrapper for search input handle autocomplete
  function handleAutocomplete(query) {
    if (visualizerMode === 'search') {
      updateVisualizer();
    }
  }

  // Hide the main search suggestions dropdown
  function hideSuggestions() {
    dropdown.classList.remove("active");
    suggestionsList.innerHTML = "";
    if (suggestionsMetrics) suggestionsMetrics.textContent = "0 matches";
  }

  // =====================================================================
  // PLAYGROUND ACTION
  // =====================================================================
  
  function handlePlaygroundInsert() {
    const input = playgroundInput.value.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (!input || input.length < 2) {
      playErrorSound();
      alert("Please enter a valid alphabetic word of length 2 or more.");
      return;
    }
    
    playgroundTrie.insert(input);
    playgroundInput.value = "";
    updateVisualizer();
    playSuccessSound();
  }

  // =====================================================================
  // ENGINE PERFORMANCE STRESS TEST CHALLENGE
  // =====================================================================

  function runStressTest() {
    initAudio();
    btnStressTest.disabled = true;
    btnStressTest.textContent = "Benchmarking Engine...";
    stressTestStatus.textContent = "Running...";
    stressStatsDisplay.style.display = "none";

    const testSeeds = [];
    for (let i = 0; i < 500; i++) {
      const city = CITIES_DATA[Math.floor(Math.random() * CITIES_DATA.length)];
      if (city.length > 3) testSeeds.push(city.slice(0, 3));
    }
    if (testSeeds.length === 0) testSeeds.push("del", "mum", "ban", "che", "kol");

    const totalQueries = 10000;
    const chunkSize = 1000;
    let queriesCompleted = 0;
    let totalDurationMs = 0;

    function runChunk() {
      const start = performance.now();
      for (let i = 0; i < chunkSize; i++) {
        const seed = testSeeds[Math.floor(Math.random() * testSeeds.length)];
        radixTrie.autocomplete(seed, 10);
      }
      const end = performance.now();
      totalDurationMs += (end - start);
      queriesCompleted += chunkSize;

      const progress = queriesCompleted / totalQueries;
      playStressTick(progress);
      
      const buttonRect = btnStressTest.getBoundingClientRect();
      spawnParticleBurst(
        buttonRect.left + Math.random() * buttonRect.width, 
        buttonRect.top + buttonRect.height / 2, 
        5, 
        "var(--color-purple)"
      );

      if (queriesCompleted < totalQueries) {
        setTimeout(runChunk, 30);
      } else {
        finalizeStressTest(totalDurationMs, totalQueries);
      }
    }
    setTimeout(runChunk, 100);
  }

  function finalizeStressTest(totalDurationMs, count) {
    const avgLatencyMs = totalDurationMs / count;
    const opsPerSec = Math.round(count / (totalDurationMs / 1000));
    
    stressTestStatus.textContent = "COMPLETE!";
    stressTestStatus.style.color = "var(--color-success)";
    
    stressStatsDisplay.style.display = "flex";
    stressAvgSpeed.textContent = `${avgLatencyMs.toFixed(4)} ms`;
    stressThroughput.textContent = `${opsPerSec.toLocaleString()} ops/sec`;
    
    btnStressTest.disabled = false;
    btnStressTest.textContent = "Re-run Lookup Stress Test";
    
    playSelectSound();
    const buttonRect = btnStressTest.getBoundingClientRect();
    spawnParticleBurst(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2, 45, "var(--color-success)");

    const latencyCard = document.getElementById("card-latency");
    latencyCard.style.boxShadow = "0 0 30px var(--color-purple-glow)";
    setTimeout(() => latencyCard.style.boxShadow = "none", 1200);
  }

  // =====================================================================
  // DYNAMIC SVG TREE VISUALIZER LAYOUT RENDERER
  // =====================================================================

  function updateVisualizer() {
    let treeData = null;
    
    if (visualizerMode === 'playground') {
      treeData = playgroundTrie.exportToJSON();
    } else {
      const query = searchInput.value.trim().toLowerCase();
      if (!query) {
        treeData = { label: "root", isEnd: false, children: [] };
      } else {
        treeData = radixTrie.exportSubtreeToJSON(query);
        if (!treeData) {
          treeData = { label: "root (no matches)", isEnd: false, children: [] };
        }
      }
    }
    
    drawTree(treeData);
  }

  function drawTree(treeData) {
    svgViewport.innerHTML = "";
    if (!treeData) return;

    let nextX = 0;
    function calculateGrid(node, depth = 0) {
      node.depth = depth;
      if (!node.children || node.children.length === 0) {
        node.xIndex = nextX;
        nextX++;
        return;
      }
      node.children.forEach(child => calculateGrid(child, depth + 1));
      
      const firstChildX = node.children[0].xIndex;
      const lastChildX = node.children[node.children.length - 1].xIndex;
      node.xIndex = (firstChildX + lastChildX) / 2;
    }
    
    calculateGrid(treeData);

    const spacingX = 140;
    const spacingY = 130;
    
    function mapCoords(node) {
      node.cx = node.xIndex * spacingX;
      node.cy = node.depth * spacingY;
      if (node.children) {
        node.children.forEach(mapCoords);
      }
    }
    mapCoords(treeData);

    const linksGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const nodesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    svgViewport.appendChild(linksGroup);
    svgViewport.appendChild(nodesGroup);

    function drawLinks(node) {
      if (!node.children) return;
      
      node.children.forEach(child => {
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        const pathData = `M ${node.cx} ${node.cy} C ${node.cx} ${(node.cy + child.cy)/2}, ${child.cx} ${(node.cy + child.cy)/2}, ${child.cx} ${child.cy}`;
        
        path.setAttribute("d", pathData);
        path.setAttribute("class", "link");
        
        if (visualizerMode === 'search' && child.label !== "") {
          path.classList.add("highlighted");
        }
        
        linksGroup.appendChild(path);

        if (child.label) {
          const midX = (node.cx + child.cx) / 2;
          const midY = (node.cy + child.cy) / 2;
          
          const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
          const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          
          text.setAttribute("x", midX);
          text.setAttribute("y", midY);
          text.setAttribute("class", "edge-text");
          text.textContent = child.label;
          
          labelGroup.appendChild(rect);
          labelGroup.appendChild(text);
          linksGroup.appendChild(labelGroup);
          
          const textBBox = text.getBBox ? text.getBBox() : { width: child.label.length * 7, height: 14 };
          rect.setAttribute("x", midX - textBBox.width / 2 - 4);
          rect.setAttribute("y", midY - 8);
          rect.setAttribute("width", textBBox.width + 8);
          rect.setAttribute("height", 16);
          rect.setAttribute("class", "edge-text-bg");
        }
        
        drawLinks(child);
      });
    }

    function drawNodes(node) {
      const nodeG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      nodeG.setAttribute("class", `node ${node.isEnd ? 'is-end' : ''}`);
      
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", node.cx);
      circle.setAttribute("cy", node.cy);
      circle.setAttribute("r", "14");
      
      if (visualizerMode === 'search' && node.label !== "root") {
        circle.classList.add("highlighted");
      }
      
      nodeG.appendChild(circle);

      if (node.label === "root" || !node.label) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", node.cx);
        text.setAttribute("y", node.cy + 30);
        text.setAttribute("text-anchor", "middle");
        text.textContent = node.label || "root";
        nodeG.appendChild(text);
      } else if (node.isEnd) {
        const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        dot.setAttribute("cx", node.cx);
        dot.setAttribute("cy", node.cy);
        dot.setAttribute("r", "4");
        dot.setAttribute("fill", "var(--color-success)");
        nodeG.appendChild(dot);
      }
      
      circle.addEventListener("mouseenter", () => {
        circle.setAttribute("r", "17");
        playHoverSound();
      });
      circle.addEventListener("mouseleave", () => {
        circle.setAttribute("r", "14");
      });

      nodesGroup.appendChild(nodeG);
      
      if (node.children) {
        node.children.forEach(drawNodes);
      }
    }

    drawLinks(treeData);
    drawNodes(treeData);
  }

  // =====================================================================
  // TAB 2: DATABASE SEED EXPORTER TOOL (Useful Tool)
  // =====================================================================
  
  function setupRoutePlannerListeners() {
    // Autocomplete for Destination City (using unified autocomplete input logic!)
    routeDestination.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length > 0) {
        handleAutocompleteInput(
          routeDestination, 
          dropdownDestination, 
          listDestination, 
          logisticsSuggestionsMetrics, 
          query, 
          5, 
          (selected) => {
            // Callback: Add selected city manually to selected basket
            if (!selectedBasket.includes(selected)) {
              selectedBasket.push(selected);
            }
            routeDestination.value = ""; // Clear input immediately for quick multiple adds
            dropdownDestination.classList.remove("active");
            
            generateDatabaseSeed();
            playSuccessSound();
          }
        );
      } else {
        dropdownDestination.classList.remove("active");
      }
    });

    // Enter key triggers adding the city if it's a valid prefix
    routeDestination.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const val = routeDestination.value.trim().toLowerCase();
        const resolved = resolveCityInput(val);
        if (resolved) {
          if (!selectedBasket.includes(resolved)) selectedBasket.push(resolved);
          routeDestination.value = "";
          dropdownDestination.classList.remove("active");
          generateDatabaseSeed();
          playSuccessSound();
        } else {
          playErrorSound();
        }
      }
    });

    // Form inputs change triggers database schema rebuild instantly
    selectStateFilter.addEventListener("change", generateDatabaseSeed);
    selectFormat.addEventListener("change", generateDatabaseSeed);
    inputNamePattern.addEventListener("input", generateDatabaseSeed);
    inputExportLimit.addEventListener("input", generateDatabaseSeed);

    // Schema button action
    btnCalcRoute.addEventListener("click", () => {
      generateDatabaseSeed();
      playSuccessSound();
    });

    // Copy to clipboard action
    btnCopySeed.addEventListener("click", () => {
      const codeText = exportCodeBlock.textContent;
      if (!codeText) return;

      navigator.clipboard.writeText(codeText).then(() => {
        playSelectSound();
        
        // Temporarily change button style to show success
        const prevText = btnCopySeed.textContent;
        btnCopySeed.textContent = "Copied!";
        btnCopySeed.style.background = "var(--color-success)";
        btnCopySeed.style.color = "var(--bg-primary)";
        btnCopySeed.style.borderColor = "var(--color-success)";
        
        setTimeout(() => {
          btnCopySeed.textContent = prevText;
          btnCopySeed.style.background = "var(--color-primary)";
          btnCopySeed.style.color = "";
          btnCopySeed.style.borderColor = "";
        }, 1200);

        // Spawn particles
        const rect = btnCopySeed.getBoundingClientRect();
        spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "var(--color-success)");
      }).catch(err => {
        playErrorSound();
        console.error("Clipboard write failed", err);
      });
    });

    // Download file action
    btnDownloadSeed.addEventListener("click", () => {
      const codeText = exportCodeBlock.textContent;
      if (!codeText) return;

      const format = selectFormat.value;
      let filename = "cities_seed.json";
      let mime = "application/json";

      if (format.startsWith("sql")) {
        filename = "cities_seed.sql";
        mime = "application/sql";
      } else if (format === "csv") {
        filename = "cities_seed.csv";
        mime = "text/csv";
      }

      const blob = new Blob([codeText], { type: mime + ";charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      playSuccessSound();
      const rect = btnDownloadSeed.getBoundingClientRect();
      spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, "var(--color-success)");
    });
  }

  // Helper to resolve city inputs
  function resolveCityInput(inputVal) {
    const cleaned = inputVal.trim().toLowerCase();
    if (!cleaned) return null;
    
    if (radixTrie.search(cleaned)) {
      return cleaned;
    }
    
    const suggestions = radixTrie.autocomplete(cleaned, 1);
    if (suggestions.length > 0) {
      return suggestions[0];
    }
    return null;
  }

  // Coordinates hasher
  function getCityCoords(cityName) {
    let hash = 0;
    for (let i = 0; i < cityName.length; i++) {
      hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);
    
    const lat = 8.4 + (hash % 280) / 10;
    const lng = 68.7 + ((hash >> 4) % 270) / 10;
    return { lat, lng };
  }

  // Geo-jurisdiction builder (District, State, PIN)
  function computeLogisticsFacts(cityName, coords, weight) {
    let hash = 0;
    for (let i = 0; i < cityName.length; i++) {
      hash = cityName.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const STATES_LIST = [
      "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "West Bengal",
      "Uttar Pradesh", "Gujarat", "Rajasthan", "Kerala", "Telangana",
      "Haryana", "Punjab", "Bihar", "Madhya Pradesh", "Andhra Pradesh",
      "Odisha", "Assam", "Jammu & Kashmir", "Goa", "Himachal Pradesh"
    ];
    const DISTRICTS_SUFFIX = ["District", "West District", "East District", "Central District", "Rural District"];
    
    const state = STATES_LIST[hash % STATES_LIST.length];
    const district = capitalizeWord(cityName) + " " + DISTRICTS_SUFFIX[(hash >> 2) % DISTRICTS_SUFFIX.length];

    let firstDigit = 8;
    if (["Delhi", "Haryana", "Punjab", "Jammu & Kashmir", "Himachal Pradesh"].includes(state)) firstDigit = 1;
    else if (["Uttar Pradesh"].includes(state)) firstDigit = 2;
    else if (["Gujarat", "Rajasthan", "Goa"].includes(state)) firstDigit = 3;
    else if (["Maharashtra", "Madhya Pradesh"].includes(state)) firstDigit = 4;
    else if (["Andhra Pradesh", "Telangana", "Karnataka"].includes(state)) firstDigit = 5;
    else if (["Tamil Nadu", "Kerala"].includes(state)) firstDigit = 6;
    else if (["West Bengal", "Odisha", "Assam"].includes(state)) firstDigit = 7;
    
    const zipCode = firstDigit.toString() + (10000 + (hash % 89999)).toString().slice(1);

    return {
      zipCode,
      state,
      district
    };
  }

  // Main code-generating engine for Tab 2 Exporter
  function generateDatabaseSeed() {
    const stateFilter = selectStateFilter.value;
    const patternFilter = inputNamePattern.value.trim().toLowerCase();
    const limit = parseInt(inputExportLimit.value) || 25;
    const format = selectFormat.value;

    const records = [];

    // 1. Manually selected cities are injected first
    selectedBasket.forEach(city => {
      const coords = getCityCoords(city);
      const facts = computeLogisticsFacts(city, coords, 0.5);
      
      // Still apply state filters to manual list if not ALL
      if (stateFilter !== "ALL" && facts.state !== stateFilter) return;
      if (patternFilter && !city.endsWith(patternFilter)) return;

      records.push({
        city: capitalizeWord(city),
        zip: facts.zipCode,
        state: facts.state,
        district: facts.district
      });
    });

    // 2. Scan global index up to limit
    for (let i = 0; i < CITIES_DATA.length; i++) {
      if (records.length >= limit) break;
      const city = CITIES_DATA[i];
      if (selectedBasket.includes(city)) continue; // skip duplicates
      
      const coords = getCityCoords(city);
      const facts = computeLogisticsFacts(city, coords, 0.5);

      if (stateFilter !== "ALL" && facts.state !== stateFilter) continue;
      if (patternFilter && !city.endsWith(patternFilter)) continue;

      records.push({
        city: capitalizeWord(city),
        zip: facts.zipCode,
        state: facts.state,
        district: facts.district
      });
    }

    // 3. Render format code string
    let codeStr = "";
    const escapeSql = str => str.replace(/'/g, "''");

    if (format === "json") {
      codeStr = JSON.stringify(records, null, 2);
    } else if (format === "sql_postgres") {
      let sql = `-- SJA Postgres Seed File\n-- Created at: ${new Date().toISOString()}\n\n`;
      sql += `CREATE TABLE IF NOT EXISTS indian_cities_directory (\n`;
      sql += `  id SERIAL PRIMARY KEY,\n`;
      sql += `  city_name VARCHAR(100) NOT NULL,\n`;
      sql += `  zip_code VARCHAR(10) NOT NULL,\n`;
      sql += `  state_name VARCHAR(100) NOT NULL,\n`;
      sql += `  district_name VARCHAR(100) NOT NULL\n`;
      sql += `);\n\n`;
      sql += `INSERT INTO indian_cities_directory (city_name, zip_code, state_name, district_name) VALUES`;
      
      const inserts = records.map(r => `\n  ('${escapeSql(r.city)}', '${r.zip}', '${escapeSql(r.state)}', '${escapeSql(r.district)}')`).join(",");
      codeStr = sql + (records.length > 0 ? inserts + ";" : "\n  -- No matching records to seed;");
    } else if (format === "sql_mysql") {
      let sql = `-- SJA MySQL Seed File\n-- Created at: ${new Date().toISOString()}\n\n`;
      sql += `CREATE TABLE IF NOT EXISTS \`indian_cities_directory\` (\n`;
      sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
      sql += `  \`city_name\` VARCHAR(100) NOT NULL,\n`;
      sql += `  \`zip_code\` VARCHAR(10) NOT NULL,\n`;
      sql += `  \`state_name\` VARCHAR(100) NOT NULL,\n`;
      sql += `  \`district_name\` VARCHAR(100) NOT NULL\n`;
      sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;
      sql += `INSERT INTO \`indian_cities_directory\` (\`city_name\`, \`zip_code\`, \`state_name\`, \`district_name\`) VALUES`;
      
      const inserts = records.map(r => `\n  ('${escapeSql(r.city)}', '${r.zip}', '${escapeSql(r.state)}', '${escapeSql(r.district)}')`).join(",");
      codeStr = sql + (records.length > 0 ? inserts + ";" : "\n  -- No matching records to seed;");
    } else if (format === "csv") {
      let csv = "id,city_name,zip_code,state_name,district_name";
      const rows = records.map((r, idx) => `\n${idx+1},"${r.city}",${r.zip},"${r.state}","${r.district}"`).join("");
      codeStr = csv + rows;
    }

    // 4. Update code viewer DOM
    exportCodeBlock.textContent = codeStr;

    // 5. Update Statistics elements
    document.getElementById("logistics-cost").textContent = `${records.length} city record${records.length === 1 ? '' : 's'}`;
    
    const sizeKb = (codeStr.length / 1024).toFixed(2);
    document.getElementById("logistics-zip").textContent = `${sizeKb} KB`;
  }

  function capitalizeWord(word) {
    return word.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  // =====================================================================
  // TAB 3: GEOGUESS SPELLING GAME LOGIC (Inbuilt Game)
  // =====================================================================
  
  function setupGameScoreboard() {
    const savedScore = localStorage.getItem("sja_game_score");
    const savedStreak = localStorage.getItem("sja_game_streak");
    const savedBestStreak = localStorage.getItem("sja_game_best_streak");

    if (savedScore) gameScore = parseInt(savedScore);
    if (savedStreak) gameStreak = parseInt(savedStreak);
    if (savedBestStreak) gameBestStreak = parseInt(savedBestStreak);

    domGameScore.textContent = gameScore.toLocaleString();
    domGameStreak.textContent = gameStreak.toLocaleString();
    domGameBestStreak.textContent = gameBestStreak.toLocaleString();
  }

  function setupGameListeners() {
    // Autocomplete for Game Guesses (using unified autocomplete input logic!)
    gameGuessInput.addEventListener("input", (e) => {
      const query = e.target.value.trim().toLowerCase();
      if (query.length > 0) {
        handleAutocompleteInput(
          gameGuessInput, 
          dropdownGame, 
          listGame, 
          gameSuggestionsMetrics, 
          query, 
          5, 
          (selected) => {
            checkAnswer();
          }
        );
      } else {
        dropdownGame.classList.remove("active");
      }
    });

    gameBtnSubmit.addEventListener("click", checkAnswer);
    gameGuessInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") checkAnswer();
    });

    gameBtnSkip.addEventListener("click", () => {
      appendGameLog(`Skipped: The answer was <strong>${capitalizeWord(gameCurrentCity)}</strong>.`, "var(--text-muted)");
      gameStreak = 0;
      updateGameDashboard();
      loadNewGameWord();
      playErrorSound();
    });

    gameBtnRevealClue.addEventListener("click", revealClue);
  }

  function loadNewGameWord() {
    let chosenCity = "";
    
    for (let attempts = 0; attempts < 1000; attempts++) {
      const city = CITIES_DATA[Math.floor(Math.random() * CITIES_DATA.length)];
      if (city.length >= 5 && city.length <= 9 && !city.includes(" ") && !city.includes("-")) {
        chosenCity = city;
        break;
      }
    }
    
    if (!chosenCity) chosenCity = "mumbai";

    gameCurrentCity = chosenCity;
    gameCluesRevealed = 0;
    
    const scrambled = scrambleString(chosenCity);
    gameScrambledWord.textContent = scrambled.toUpperCase().split("").join(" ");
    gameGuessInput.value = "";
    dropdownGame.classList.remove("active");
    
    gameClueText.innerHTML = `<i>- Clue 1: Word length is <strong>${chosenCity.length}</strong> characters. Starts with <strong>"${chosenCity[0].toUpperCase()}"</strong>.</i>`;
  }

  function scrambleString(str) {
    const arr = str.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    const scrambled = arr.join("");
    if (scrambled === str) return scrambleString(str);
    return scrambled;
  }

  function revealClue() {
    if (gameCluesRevealed >= 2) {
      playErrorSound();
      alert("No more clues available for this word!");
      return;
    }
    
    gameCluesRevealed++;
    playHoverSound();

    if (gameCluesRevealed === 1) {
      const char3 = gameCurrentCity[2] ? gameCurrentCity[2].toUpperCase() : "_";
      gameClueText.innerHTML += `<br>- Clue 2: The third letter is <strong>"${char3}"</strong>.`;
    } else if (gameCluesRevealed === 2) {
      const lastChar = gameCurrentCity[gameCurrentCity.length - 1].toUpperCase();
      gameClueText.innerHTML += `<br>- Clue 3: The word ends with <strong>"${lastChar}"</strong>.`;
    }
  }

  function checkAnswer() {
    const guess = gameGuessInput.value.trim().toLowerCase();
    
    if (!guess) {
      playErrorSound();
      alert("Please enter a guess!");
      return;
    }

    if (guess === gameCurrentCity) {
      const points = 10 - gameCluesRevealed * 2;
      gameScore += points;
      gameStreak++;
      
      if (gameStreak > gameBestStreak) {
        gameBestStreak = gameStreak;
      }

      appendGameLog(`Correct! <strong>${capitalizeWord(gameCurrentCity)}</strong> (+${points} pts)`, "var(--color-success)");
      updateGameDashboard();
      playSuccessSound();
      
      const rect = gameScrambledWord.getBoundingClientRect();
      spawnParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 35, "var(--color-accent)");
      
      loadNewGameWord();
    } else {
      playErrorSound();
      appendGameLog(`Incorrect: <strong>"${guess}"</strong>. Try again!`, "var(--color-purple)");
      gameStreak = 0;
      updateGameDashboard();
      
      const board = gameScrambledWord.parentElement;
      board.style.borderColor = "var(--color-purple)";
      setTimeout(() => board.style.borderColor = "rgba(168, 85, 247, 0.35)", 300);
    }
  }

  function updateGameDashboard() {
    domGameScore.textContent = gameScore.toLocaleString();
    domGameStreak.textContent = gameStreak.toLocaleString();
    domGameBestStreak.textContent = gameBestStreak.toLocaleString();

    localStorage.setItem("sja_game_score", gameScore);
    localStorage.setItem("sja_game_streak", gameStreak);
    localStorage.setItem("sja_game_best_streak", gameBestStreak);
  }

  function appendGameLog(message, colorClass = "var(--text-secondary)") {
    const item = document.createElement("div");
    item.style.color = colorClass;
    item.style.marginBottom = "0.25rem";
    item.innerHTML = `• ${message}`;
    gameLog.appendChild(item);
    gameLog.scrollTop = gameLog.scrollHeight;
  }

  // Fire initialization
  initializeApp();

  // =====================================================================
  // TAB 4: PATTERN SEARCH
  // =====================================================================
  let ptnCurrentMode = 'contains';
  let ptnCurrentMatches = [];

  function setupPatternSearch() {
    const ptnInput = document.getElementById('ptn-input');
    const ptnMinLen = document.getElementById('ptn-min-len');
    const ptnMaxLen = document.getElementById('ptn-max-len');
    const btnPtnSearch = document.getElementById('btn-ptn-search');
    const ptnStats = document.getElementById('ptn-stats');
    const ptnMatchCount = document.getElementById('ptn-match-count');
    const ptnSearchTime = document.getElementById('ptn-search-time');
    const ptnResultsList = document.getElementById('ptn-results-list');
    const ptnShowingLabel = document.getElementById('ptn-showing-label');
    const btnPtnExport = document.getElementById('btn-ptn-export');
    const modeBtns = document.querySelectorAll('.ptn-mode-btn');

    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ptnCurrentMode = btn.dataset.mode;
      });
    });

    function runPatternSearch() {
      const query = ptnInput.value.trim().toLowerCase();
      const minLen = parseInt(ptnMinLen.value) || 1;
      const maxLen = parseInt(ptnMaxLen.value) || 100;

      const t0 = performance.now();
      ptnCurrentMatches = CITIES_DATA.filter(city => {
        const c = city.toLowerCase();
        if (c.length < minLen || c.length > maxLen) return false;
        if (!query) return true;
        switch (ptnCurrentMode) {
          case 'contains': return c.includes(query);
          case 'starts':   return c.startsWith(query);
          case 'ends':     return c.endsWith(query);
          case 'exact':    return c === query;
          default:         return c.includes(query);
        }
      });
      const t1 = performance.now();

      ptnStats.style.display = 'block';
      ptnMatchCount.textContent = ptnCurrentMatches.length.toLocaleString();
      ptnSearchTime.textContent = `${(t1 - t0).toFixed(2)} ms`;
      ptnShowingLabel.textContent = `Showing ${Math.min(ptnCurrentMatches.length, 500)} of ${ptnCurrentMatches.length} results`;

      ptnResultsList.innerHTML = '';
      const toShow = ptnCurrentMatches.slice(0, 500);
      if (toShow.length === 0) {
        ptnResultsList.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">No cities matched this pattern.</span>';
      } else {
        toShow.forEach(city => {
          const tag = document.createElement('span');
          tag.textContent = city;
          tag.style.cssText = 'background:rgba(6,182,212,0.12); border:1px solid rgba(6,182,212,0.3); border-radius:999px; padding:0.2rem 0.65rem; font-size:0.8rem; color:var(--color-accent); cursor:default; white-space:nowrap;';
          ptnResultsList.appendChild(tag);
        });
      }
      btnPtnExport.style.display = ptnCurrentMatches.length > 0 ? 'block' : 'none';
    }

    btnPtnSearch.addEventListener('click', runPatternSearch);
    ptnInput.addEventListener('keydown', e => { if (e.key === 'Enter') runPatternSearch(); });

    btnPtnExport.addEventListener('click', () => {
      const blob = new Blob([ptnCurrentMatches.join('\n')], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `indian_cities_${ptnCurrentMode}_${Date.now()}.txt`;
      a.click();
    });
  }
  setupPatternSearch();

  // =====================================================================
  // TAB 5: CITY ANALYTICS
  // =====================================================================
  let analyticsRendered = false;

  function renderAnalytics() {
    if (analyticsRendered) return;
    analyticsRendered = true;

    const cities = CITIES_DATA.map(c => c.toLowerCase());

    // --- Length Distribution ---
    const lenMap = {};
    let totalLen = 0;
    cities.forEach(c => {
      lenMap[c.length] = (lenMap[c.length] || 0) + 1;
      totalLen += c.length;
    });
    const avgLen = (totalLen / cities.length).toFixed(1);
    document.getElementById('analytics-avg-len').textContent = avgLen;

    const lenChart = document.getElementById('analytics-length-chart');
    const lenLabels = document.getElementById('analytics-length-labels');
    const lenKeys = Object.keys(lenMap).map(Number).sort((a, b) => a - b);
    const lenMax = Math.max(...Object.values(lenMap));
    lenChart.innerHTML = '';
    lenLabels.innerHTML = '';
    lenKeys.forEach(k => {
      const h = Math.round((lenMap[k] / lenMax) * 130);
      const bar = document.createElement('div');
      bar.title = `Length ${k}: ${lenMap[k]} cities`;
      bar.style.cssText = `flex:1; min-width:4px; height:${h}px; background:linear-gradient(to top, var(--color-accent), var(--color-primary)); border-radius:2px 2px 0 0; opacity:0.85; transition:opacity 0.2s; cursor:default;`;
      bar.onmouseover = () => bar.style.opacity = '1';
      bar.onmouseout = () => bar.style.opacity = '0.85';
      lenChart.appendChild(bar);

      const lbl = document.createElement('span');
      lbl.textContent = k;
      lbl.style.cssText = 'flex:1; text-align:center; min-width:4px; font-size:0.55rem; color:var(--text-muted);';
      lenLabels.appendChild(lbl);
    });

    // --- Letter Frequency ---
    const letterMap = {};
    cities.forEach(c => {
      const ch = c[0];
      if (ch && /[a-z]/.test(ch)) {
        letterMap[ch] = (letterMap[ch] || 0) + 1;
      }
    });
    const letterKeys = Object.keys(letterMap).sort();
    const letterMax = Math.max(...Object.values(letterMap));
    const topLetter = letterKeys.reduce((a, b) => (letterMap[a] || 0) >= (letterMap[b] || 0) ? a : b, letterKeys[0]);
    document.getElementById('analytics-top-letter').textContent = `"${topLetter.toUpperCase()}" (${letterMap[topLetter].toLocaleString()} cities)`;

    const letterChart = document.getElementById('analytics-letter-chart');
    const letterLabels = document.getElementById('analytics-letter-labels');
    letterChart.innerHTML = '';
    letterLabels.innerHTML = '';
    letterKeys.forEach(ch => {
      const h = Math.round((letterMap[ch] / letterMax) * 130);
      const bar = document.createElement('div');
      bar.title = `"${ch.toUpperCase()}": ${letterMap[ch]} cities`;
      bar.style.cssText = `flex:1; min-width:5px; height:${h}px; background:linear-gradient(to top, var(--color-purple), rgba(168,85,247,0.5)); border-radius:2px 2px 0 0; opacity:0.85; transition:opacity 0.2s; cursor:default;`;
      bar.onmouseover = () => bar.style.opacity = '1';
      bar.onmouseout = () => bar.style.opacity = '0.85';
      letterChart.appendChild(bar);

      const lbl = document.createElement('span');
      lbl.textContent = ch.toUpperCase();
      lbl.style.cssText = 'flex:1; text-align:center; min-width:5px; font-size:0.55rem; color:var(--text-muted);';
      letterLabels.appendChild(lbl);
    });

    // --- Top Suffixes ---
    const suffixLen = 3;
    const suffixMap = {};
    cities.forEach(c => {
      if (c.length >= suffixLen + 1) {
        const sfx = c.slice(-suffixLen);
        suffixMap[sfx] = (suffixMap[sfx] || 0) + 1;
      }
    });
    const topSuffixes = Object.entries(suffixMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const sfxMax = topSuffixes[0]?.[1] || 1;
    const sfxContainer = document.getElementById('analytics-suffixes');
    sfxContainer.innerHTML = '';
    topSuffixes.forEach(([sfx, cnt]) => {
      const pct = Math.round((cnt / sfxMax) * 100);
      sfxContainer.innerHTML += `
        <div style="font-size:0.82rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="color:var(--text-primary); font-family:monospace;">-${sfx}</span>
            <span style="color:var(--text-muted);">${cnt.toLocaleString()} cities</span>
          </div>
          <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px;">
            <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--color-success), rgba(16,185,129,0.4)); border-radius:2px;"></div>
          </div>
        </div>`;
    });

    // --- Top Prefixes ---
    const prefixLen = 3;
    const prefixMap = {};
    cities.forEach(c => {
      if (c.length >= prefixLen + 1) {
        const pfx = c.slice(0, prefixLen);
        prefixMap[pfx] = (prefixMap[pfx] || 0) + 1;
      }
    });
    const topPrefixes = Object.entries(prefixMap).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const pfxMax = topPrefixes[0]?.[1] || 1;
    const pfxContainer = document.getElementById('analytics-prefixes');
    pfxContainer.innerHTML = '';
    topPrefixes.forEach(([pfx, cnt]) => {
      const pct = Math.round((cnt / pfxMax) * 100);
      pfxContainer.innerHTML += `
        <div style="font-size:0.82rem;">
          <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
            <span style="color:var(--text-primary); font-family:monospace;">${pfx}-</span>
            <span style="color:var(--text-muted);">${cnt.toLocaleString()} cities</span>
          </div>
          <div style="height:4px; background:rgba(255,255,255,0.05); border-radius:2px;">
            <div style="height:100%; width:${pct}%; background:linear-gradient(90deg, var(--color-primary), rgba(59,130,246,0.4)); border-radius:2px;"></div>
          </div>
        </div>`;
    });
  }

  // =====================================================================
  // TAB 6: TEXT SCANNER
  // =====================================================================
  function setupTextScanner() {
    const scannerInput = document.getElementById('scanner-input');
    const btnScan = document.getElementById('btn-scan');
    const btnScanClear = document.getElementById('btn-scan-clear');
    const scannerStats = document.getElementById('scanner-stats');
    const scanWordCount = document.getElementById('scan-word-count');
    const scanCityCount = document.getElementById('scan-city-count');
    const scanTime = document.getElementById('scan-time');
    const scannerOutput = document.getElementById('scanner-output');
    const scannerCitiesList = document.getElementById('scanner-cities-list');
    const btnScanCopy = document.getElementById('btn-scan-copy');

    // Build a fast lookup Set from CITIES_DATA
    const citySet = new Set(CITIES_DATA.map(c => c.toLowerCase()));

    btnScan.addEventListener('click', () => {
      const text = scannerInput.value;
      if (!text.trim()) {
        scannerOutput.innerHTML = '<span style="color:var(--text-muted);">Please paste some text first.</span>';
        return;
      }

      const t0 = performance.now();

      // Tokenize: split on non-alpha characters
      const tokens = text.split(/([^a-zA-Z]+)/);
      let wordCount = 0;
      const foundCities = new Set();

      // First pass: find cities (try 2-word combos too)
      const wordTokens = text.match(/[a-zA-Z]+/g) || [];
      wordCount = wordTokens.length;

      // Single word match
      wordTokens.forEach(w => {
        if (citySet.has(w.toLowerCase())) foundCities.add(w.toLowerCase());
      });
      // Two-word match (e.g. "New Delhi", "Port Blair")
      for (let i = 0; i < wordTokens.length - 1; i++) {
        const combo = (wordTokens[i] + ' ' + wordTokens[i + 1]).toLowerCase();
        if (citySet.has(combo)) foundCities.add(combo);
      }

      const t1 = performance.now();

      scannerStats.style.display = 'block';
      scanWordCount.textContent = wordCount.toLocaleString();
      scanCityCount.textContent = foundCities.size.toLocaleString();
      scanTime.textContent = `${(t1 - t0).toFixed(2)} ms`;

      // Highlighted output: wrap city matches in <mark>
      let highlighted = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const sortedCities = [...foundCities].sort((a, b) => b.length - a.length); // longest first
      sortedCities.forEach(city => {
        const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`\\b${escaped}\\b`, 'gi');
        highlighted = highlighted.replace(re, match =>
          `<mark style="background:rgba(6,182,212,0.3); color:var(--color-accent); border-radius:3px; padding:0 2px;">${match}</mark>`
        );
      });
      scannerOutput.innerHTML = highlighted || '<span style="color:var(--text-muted);">No text provided.</span>';

      // City list tags
      scannerCitiesList.innerHTML = '';
      if (foundCities.size === 0) {
        scannerCitiesList.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">No Indian cities detected in this text.</span>';
        btnScanCopy.style.display = 'none';
      } else {
        [...foundCities].sort().forEach(city => {
          const tag = document.createElement('span');
          tag.textContent = city.replace(/\b\w/g, c => c.toUpperCase());
          tag.style.cssText = 'background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); border-radius:999px; padding:0.2rem 0.65rem; font-size:0.8rem; color:var(--color-success); white-space:nowrap;';
          scannerCitiesList.appendChild(tag);
        });
        btnScanCopy.style.display = 'block';
      }
    });

    btnScanClear.addEventListener('click', () => {
      scannerInput.value = '';
      scannerOutput.innerHTML = '<span style="color:var(--text-muted);">Highlighted text will appear here after scanning...</span>';
      scannerCitiesList.innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">No cities detected yet.</span>';
      scannerStats.style.display = 'none';
      btnScanCopy.style.display = 'none';
    });

    btnScanCopy.addEventListener('click', () => {
      const cityTags = scannerCitiesList.querySelectorAll('span');
      const cityText = [...cityTags].map(t => t.textContent).join(', ');
      navigator.clipboard.writeText(cityText).then(() => {
        btnScanCopy.textContent = '✅ Copied!';
        setTimeout(() => { btnScanCopy.textContent = '📋 Copy City List'; }, 2000);
      });
    });
  }
  setupTextScanner();

});
