// StatsCharts.js — renders 5 statistical tests using Chart.js, pulling from /api/stats/*
// This file does not modify existing logic. It only listens for DOMContentLoaded and filter changes.

(function () {
    const $ = sel => document.querySelector(sel);

    function getSource() { return ($('#filterSource')?.value || 'scientist'); }

    // Get theme-appropriate colors
    function getThemeColors() {
        // Check localStorage first (most reliable), then DOM
        const savedTheme = localStorage.getItem('theme');
        const isDark = savedTheme === 'dark' ||
                      document.documentElement.className.includes('theme-dark') ||
                      document.documentElement.getAttribute('data-theme') === 'dark' ||
                      document.documentElement.classList.contains('dark') ||
                      document.body.classList.contains('dark');        if (isDark) {
            return {
                text: 'rgba(76, 212, 105, 0.82)',
                lines: 'rgba(54, 162, 235, 1)',
                background: 'rgba(76, 212, 105, 0.53)',
                border: 'rgba(76,212,105,.25)',
                grid: 'rgba(76,212,105,.12)'
            };
        } else {
            return {
                text: '#333333',
                lines: '#666666', 
                background: '#f0f0f0',
                border: '#cccccc',
                grid: '#e0e0e0'
            };
        }
    }

    // ---------- Helpers ----------
    
    function addBarControls(chartElement, labels, means, colors, chart) {
        // Find or create controls container
        let controlsContainer = chartElement.parentElement.querySelector('.bar-controls');
        if (!controlsContainer) {
            controlsContainer = document.createElement('div');
            controlsContainer.className = 'bar-controls';
            controlsContainer.style.cssText = 'margin-top: 10px; text-align: center;';
            chartElement.parentElement.appendChild(controlsContainer);
        }
        
        // Clear existing controls
        controlsContainer.innerHTML = '';
        
        // Create checkboxes for each bar
        labels.forEach((label, index) => {
            const checkboxContainer = document.createElement('div');
            checkboxContainer.style.cssText = 'display: inline-block; margin: 0 10px;';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `bar-control-${index}`;
            checkbox.checked = true;
            checkbox.style.cssText = 'margin-right: 5px;';
            
            const labelElement = document.createElement('label');
            labelElement.htmlFor = `bar-control-${index}`;
            labelElement.style.cssText = `color: ${colors[index].replace('0.6', '1')}; font-weight: bold; cursor: pointer;`;
            labelElement.textContent = label;
            
            // Add click handler
            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    chart.show(index);
                } else {
                    chart.hide(index);
                }
                chart.update();
            });
            
            checkboxContainer.appendChild(checkbox);
            checkboxContainer.appendChild(labelElement);
            controlsContainer.appendChild(checkboxContainer);
        });
    }
    
    function makeBarChart(ctx, labels, values, title) {
        const colors = getThemeColors();
        return new Chart(ctx, {
            type: 'bar',
            data: { 
                labels, 
                datasets: [{ 
                    label: title, 
                    data: values,
                    backgroundColor: 'rgba(160, 200, 228, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text
                        },
                        onClick: function(e, legendItem, legend) {
                            // Toggle visibility of the dataset
                            const index = legendItem.datasetIndex;
                            const chart = legend.chart;
                            
                            if (chart.isDatasetVisible(index)) {
                                chart.hide(index);
                                legendItem.hidden = true;
                            } else {
                                chart.show(index);
                                legendItem.hidden = false;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: colors.text
                        },
                        grid: {
                            color: colors.grid
                        }
                    },
                    y: {
                        ticks: {
                            color: colors.text
                        },
                        grid: {
                            color: colors.grid
                        }
                    }
                }
            }
        });
    }
    function makeBoxPlotApprox(ctx, labels, series) {
        // approximate as bar of means with error bars (sd) – keeps dependencies small
        const colors = getThemeColors();
        return new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'mean ± sd',
                    data: series.map(s => s.mean),
                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1,
                    errorBars: series.reduce((acc, s, i) => { acc[labels[i]] = { plus: s.sd || 0, minus: s.sd || 0 }; return acc; }, {})
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: colors.text
                        },
                        grid: {
                            color: colors.grid
                        }
                    },
                    y: {
                        ticks: {
                            color: colors.text
                        },
                        grid: {
                            color: colors.grid
                        }
                    }
                }
            }
        });
    }
    function drawScatterWithLine(ctx, points, b0, b1, title) {
        const colors = getThemeColors();
        const xs = points.map(p => p.x);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const line = [{ x: minX, y: b0 + b1 * minX }, { x: maxX, y: b0 + b1 * maxX }];
        return new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [
                    { 
                        label: title, 
                        data: points,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        pointBackgroundColor: 'rgba(75, 192, 192, 0.8)',
                        pointBorderColor: 'rgba(75, 192, 192, 1)'
                    },
                    { 
                        label: 'fit', 
                        type: 'line', 
                        data: line, 
                        fill: false,
                        borderColor: colors.lines,
                        backgroundColor: 'transparent',
                        pointRadius: 0
                    }
                ]
            },
            options: { 
                parsing: false, 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: colors.text
                        },
                        grid: {
                            color: colors.grid
                        }
                    },
                    y: {
                        ticks: {
                            color: colors.text
                        },
                        grid: {
                            color: colors.grid
                        }
                    }
                }
            }
        });
    }
    function cramersV(table) {
        const groups = table.map(r => [r.invasive || 0, r.native || 0]);
        const n = groups.reduce((s, g) => s + g[0] + g[1], 0);
        const rowSums = groups.map(g => g[0] + g[1]);
        const colSums = [
            groups.reduce((s, g) => s + g[0], 0),
            groups.reduce((s, g) => s + g[1], 0)
        ];
        const expected = groups.map((g, i) => [
            rowSums[i] * colSums[0] / n,
            rowSums[i] * colSums[1] / n
        ]);
        const chi2 = groups.reduce((s, g, i) =>
            s
            + ((g[0] - expected[i][0]) ** 2) / (expected[i][0] || 1e-12)
            + ((g[1] - expected[i][1]) ** 2) / (expected[i][1] || 1e-12),
            0
        );
        const k = 2, r = groups.length;
        const v = Math.sqrt((chi2 / n) / Math.min(k - 1, r - 1 || 1));
        return { chi2, v };
    }
    function welchPvalue(t, df) {
        // two-sided p using jStat
        if (!window.jStat) return null;
        const p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
        return p;
    }

    // ---------- Fetchers ----------
    async function fetchJSON(url) { 
        console.log('Fetching:', url);
        const r = await fetch(url); 
        console.log('Response status:', r.status);
        if (r.status === 204) return null; 
        if (!r.ok) {
            console.error('Fetch error:', r.status, r.statusText);
            throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        const data = await r.json();
        console.log('Response data:', data);
        return data;
    }

    // ---------- Charts ----------
    let CH = {};

    async function render_ttest() {
        const src = getSource();
        console.log('Rendering T-test chart...');
        try {
            const data = await fetchJSON(`/api/analytics-parser?endpoint=t_test_depth&source=${src}`);
            console.log('T-test data received:', data);
            const el = $('#chart_ttest_depth'); 
            if (!el) {
                console.error('T-test chart element not found');
                return;
            }
            if (!data) {
                console.error('T-test data is null or undefined');
                return;
            }
        
        // Check if we have the new format with approved/denied data
        if (data.approved && data.denied) {
            // New format: show only 2 bars (approved vs denied) with depth as legend
            const labels = ['Approved', 'Denied'];
            const means = [];
            const colors = ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'];
            
            // Calculate average density for approved (shallow + deep)
            const approvedMean = (data.approved.depthA.mean + data.approved.depthB.mean) / 2;
            means.push(approvedMean);
            
            // Calculate average density for denied (shallow + deep)
            const deniedMean = (data.denied.depthA.mean + data.denied.depthB.mean) / 2;
            means.push(deniedMean);
            
            const p = welchPvalue(data.approved.test.t, data.approved.test.df);
            if (CH.ttest) { try { CH.ttest.destroy(); } catch (_) { } }
            
            // Create simple bar chart with 2 bars
            CH.ttest = new Chart(el.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Approved',
                            data: [means[0], 0],
                            backgroundColor: colors[0],
                            borderColor: colors[0].replace('0.6', '1'),
                            borderWidth: 1
                        },
                        {
                            label: 'Denied',
                            data: [0, means[1]],
                            backgroundColor: colors[1],
                            borderColor: colors[1].replace('0.6', '1'),
                            borderWidth: 1
                        }
                        
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: { display: false },
                        legend: { 
                            display: true
                        }
                    },
                    scales: {
                        y: { 
                            beginAtZero: true
                        }
                    },
                    datasets: {
                        bar: {
                            barThickness: 50,
                            maxBarThickness: 80
                        }
                    }
                }
            });
        } else {
            // Old format: backward compatibility
            console.log('Using old T-test format');
            const allLabels = [`${data.depthA.depth} m`, `${data.depthB.depth} m`];
            const allMeans = [data.depthA.mean, data.depthB.mean];
            
            const labels = [];
            const means = [];
            
            for (let i = 0; i < allLabels.length; i++) {
                if (allMeans[i] && allMeans[i] > 0) {
                    labels.push(allLabels[i]);
                    means.push(allMeans[i]);
                }
            }
            
            const p = welchPvalue(data.test.t, data.test.df);
            const title = p != null ? `Density (p=${p.toFixed(4)})` : 'Density';
            if (CH.ttest) { try { CH.ttest.destroy(); } catch (_) { } }
            CH.ttest = makeBarChart(el.getContext('2d'), labels, means, title);
        }
        } catch (error) {
            console.error('Error rendering T-test chart:', error);
        }
    }

    async function render_anova_beach() {
        const src = getSource();
        const data = await fetchJSON(`/api/analytics-parser?endpoint=anova_beach&source=${src}`);
        const el = $('#chart_anova_beach'); if (!el || !data) return;
        const labels = data.groups.map(g => g.group);
        const values = data.groups.map(g => g.mean);
        if (CH.anovaBeach) { try { CH.anovaBeach.destroy(); } catch (_) { } }
        CH.anovaBeach = makeBarChart(el.getContext('2d'), labels, values, 'Mean density');
    }

    async function render_anova_habitat() {
        const src = getSource();
        const data = await fetchJSON(`/api/analytics-parser?endpoint=anova_habitat&source=${src}`);
        const el = $('#chart_anova_habitat'); if (!el || !data) return;
        const labels = data.groups.map(g => g.group);
        const values = data.groups.map(g => g.mean);
        if (CH.anovaHabitat) { try { CH.anovaHabitat.destroy(); } catch (_) { } }
        CH.anovaHabitat = makeBarChart(el.getContext('2d'), labels, values, 'Mean density');
    }

    async function render_regression() {
        const src = getSource();
        console.log('Rendering regression chart...');
        try {
            const data = await fetchJSON(`/api/analytics-parser?endpoint=regression_waterlevel&source=${src}`);
            console.log('Regression data received:', data);
            const el = $('#chart_reg_water'); 
            if (!el) {
                console.error('Regression chart element not found');
                return;
            }
            if (!data) {
                console.error('Regression data is null or undefined');
                return;
            }
            if (CH.reg) { try { CH.reg.destroy(); } catch (_) { } }
            CH.reg = drawScatterWithLine(el.getContext('2d'), data.points, data.coef.intercept, data.coef.slope, `R² = ${data.r2.toFixed(3)}`);
            console.log('Regression chart rendered successfully');
        } catch (error) {
            console.error('Error rendering regression chart:', error);
        }
    }

    async function render_chi() {
        const src = getSource();
        console.log('Rendering chi-square chart...');
        try {
            const data = await fetchJSON(`/api/analytics-parser?endpoint=chi_species_by&by=beach&source=${src}`);
            console.log('Chi-square data received:', data);
            const el = $('#chart_chi_species'); 
            if (!el) {
                console.error('Chi-square chart element not found');
                return;
            }
            if (!data) {
                console.error('Chi-square data is null or undefined');
                return;
            }
        const labels = data.table.map(r => r.group);
        const invasive = data.table.map(r => r.invasive || 0);
        const native = data.table.map(r => r.native || 0);
        const ctx = el.getContext('2d');
        if (CH.chi) { try { CH.chi.destroy(); } catch (_) { } }
        const colors = getThemeColors();
        CH.chi = new Chart(ctx, {
            type: 'bar',
            data: { 
                labels, 
                datasets: [
                    { 
                        label: 'Invasive', 
                        data: invasive,
                        backgroundColor: 'rgba(255, 99, 132, 0.6)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1
                    }, 
                    { 
                        label: 'Native', 
                        data: native,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }
                ] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: colors.text
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: colors.text
                        },
                        grid: {
                            color: colors.grid
                        }
                    },
                    y: {
                        ticks: {
                            color: colors.text
                        },
                        grid: {
                            color: colors.grid
                        }
                    }
                }
            }
        });
        const m = cramersV(data.table);
        console.log('Chi-square:', m);
        console.log('Chi-square chart rendered successfully');
        } catch (error) {
            console.error('Error rendering chi-square chart:', error);
        }
    }

    async function renderAll() {
        const tasks = [
            render_ttest().catch(() => { }),
            render_anova_beach().catch(() => { }),
            render_anova_habitat().catch(() => { }),
            render_regression().catch(() => { }),
            render_chi().catch(() => { })
        ];
        await Promise.allSettled(tasks);
    }

    document.addEventListener('DOMContentLoaded', () => {
        // Kriging controls
        const krBtn = document.querySelector('#krigRun');
        if (krBtn) {
            krBtn.addEventListener('click', () => render_kriging());
        }
        // Listen for dropdown ready event from AdminApp.js
        document.addEventListener('krging-dropdown-ready', () => {
            render_kriging(); // Auto-run when dropdown is initialized with default
        });
        
        // Listen for species change event from AdminApp.js
        document.addEventListener('kriging-species-changed', () => {
            render_kriging(); // Re-run kriging when species changes
        });
        if (!window.Chart) return;
        renderAll();
        const srcSel = $('#filterSource');
        if (srcSel) srcSel.addEventListener('change', renderAll);
        
        // Listen for theme changes and update chart colors
        window.addEventListener('ecologic:theme-change', () => {
            // Small delay to let theme change complete
            setTimeout(() => {
                renderAll();
            }, 150);
        });
        
        // Also listen for the theme toggle button click as a backup
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                setTimeout(() => {
                    renderAll();
                }, 200);
            });
        }
    });
    async function render_kriging() {
        console.log('Rendering kriging map...');
        try {
            const src = (document.querySelector('#filterSource')?.value || 'scientist');
            const field = (document.querySelector('#krigField')?.value || 'density_per_m2');
            const speciesRaw = (document.querySelector('#krigSpecies')?.value || '');
            const species = speciesRaw.trim() ? encodeURIComponent(speciesRaw.trim()) : '';
            const url = `/api/analytics-parser?endpoint=kriging_map&source=${src}&field=${encodeURIComponent(field)}${species ? `&species=${species}` : ''}&grid=160`;
            console.log('Kriging URL:', url);
            const el = document.querySelector('#krigingMap');
            const info = document.querySelector('#krigStats');
            const legend = document.querySelector('#krigLegend');
            if (!el) {
                console.error('Kriging map element not found');
                return;
            }
            const r = await fetch(url);
            if (r.status === 204) {
                // legend + info
                legend && (legend.textContent =
                    `min=${vmin.toFixed(2)} · max=${vmax.toFixed(2)} · N≈${Math.round(Math.sqrt(grid.length))}²`);
                info && (info.textContent =
                    `Source=${data.source} · Field=${data.field}${data.species ? ` · Species=${data.species}` : ''}`);
                return;
            }
            const data = await r.json();
            const { size: { width, height }, grid, vmin, vmax } = data;
            // draw on canvas (scale grid to canvas)
            const ctx = el.getContext('2d');
            const img = ctx.createImageData(width, height);
            // simple perceptual-ish colormap (blue->cyan->yellow->red)
            function color(t) {
                // t in [0,1]
                const r = Math.min(255, Math.max(0, 255 * Math.max(0, 1.5 * t - 0.2)));
                const g = Math.min(255, Math.max(0, 255 * Math.min(1, Math.max(0, 1.5 * t))));
                const b = Math.min(255, Math.max(0, 255 * (1 - t)));
                return [r | 0, g | 0, b | 0];
            }
            for (let i = 0; i < grid.length; i++) {
                const t = (grid[i] - vmin) / (vmax - vmin || 1);
                const [r, g, b] = color(Math.min(1, Math.max(0, t)));
                img.data[4 * i + 0] = r;
                img.data[4 * i + 1] = g;
                img.data[4 * i + 2] = b;
                img.data[4 * i + 3] = 255;
            }
            // clear & paint
            ctx.clearRect(0, 0, el.width, el.height);
            // put small image and scale to canvas
            const off = document.createElement('canvas');
            off.width = width; off.height = height;
            off.getContext('2d').putImageData(img, 0, 0);
            ctx.imageSmoothingEnabled = false;
            ctx.drawImage(off, 0, 0, el.width, el.height);

            // legend
            legend && (legend.textContent =
                `min=${vmin.toFixed(2)} · max=${vmax.toFixed(2)} · N≈${Math.round(Math.sqrt(grid.length))}²`);
            info && (info.textContent =
                `Source=${data.source} · Field=${data.field}${data.species ? ` · Species=${data.species}` : ''}`);
            console.log('Kriging map rendered successfully');
        } catch (e) {
            console.error('Error rendering kriging map:', e);
            info && (info.textContent = 'Kriging failed.');
        }
    }
})();