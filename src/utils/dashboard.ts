import type { WorkSummary } from "../types.ts";

export function generateDashboardHTML(summary: WorkSummary): string {
	const sourceGroups = new Map<string, typeof summary.items>();
	for (const item of summary.items) {
		const existing = sourceGroups.get(item.source) || [];
		existing.push(item);
		sourceGroups.set(item.source, existing);
	}

	const total = summary.items.length;
	const chartData = Array.from(sourceGroups.entries()).map(([source, items]) => ({
		source,
		count: items.length,
		percentage: total === 0 ? 0 : Math.round((items.length / total) * 100),
	}));

	const hourlyData = Array.from({ length: 24 }, () => 0);
	for (const item of summary.items) {
		const hour = item.timestamp.getHours();
		const current = hourlyData[hour] ?? 0;
		hourlyData[hour] = current + 1;
	}

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Worklog Dashboard - ${summary.dateRange.start.toDateString()}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007acc;
        }
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
        }
        .chart-container {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
        }
        .chart-title {
            font-size: 1.2em;
            font-weight: bold;
            margin-bottom: 15px;
            text-align: center;
        }
        .source-breakdown {
            margin-top: 30px;
        }
        .source-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .source-name {
            font-weight: bold;
        }
        .source-count {
            color: #007acc;
            font-weight: bold;
        }
        .generated-at {
            text-align: center;
            color: #666;
            margin-top: 30px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Worklog Dashboard</h1>
            <p>${summary.dateRange.start.toLocaleDateString()} - ${summary.dateRange.end.toLocaleDateString()}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${summary.items.length}</div>
                <div class="stat-label">Total Activities</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${sourceGroups.size}</div>
                <div class="stat-label">Active Sources</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${hourlyData.length === 0 ? 0 : Math.max(...hourlyData, 0)}</div>
                <div class="stat-label">Peak Hour Activity</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${hourlyData.filter((h) => h > 0).length}</div>
                <div class="stat-label">Active Hours</div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-container">
                <div class="chart-title">Activity by Source</div>
                <canvas id="sourceChart" width="400" height="300"></canvas>
            </div>
            <div class="chart-container">
                <div class="chart-title">Hourly Activity Distribution</div>
                <canvas id="hourlyChart" width="400" height="300"></canvas>
            </div>
        </div>

        <div class="source-breakdown">
            <h2>📋 Detailed Breakdown</h2>
            ${Array.from(sourceGroups.entries())
							.map(
								([source, items]) => `
                <div class="source-item">
                    <span class="source-name">${source.toUpperCase()}</span>
                    <span class="source-count">${items.length} activities</span>
                </div>
                ${items
									.slice(0, 3)
									.map(
										(item) => `
                    <div style="margin-left: 20px; color: #666; font-size: 0.9em;">
                        ${item.timestamp.toLocaleTimeString()} - ${item.title}
                    </div>
                `,
									)
									.join("")}
                ${items.length > 3 ? `<div style="margin-left: 20px; color: #999; font-size: 0.8em;">...and ${items.length - 3} more</div>` : ""}
            `,
							)
							.join("")}
        </div>

        <div class="generated-at">
            Generated at ${summary.generatedAt.toLocaleString()}
        </div>
    </div>

    <script>
        const sourceCtx = document.getElementById('sourceChart').getContext('2d');
        const sourceData = ${JSON.stringify(chartData)};

        new Chart(sourceCtx, {
            type: 'doughnut',
            data: {
                labels: sourceData.map(d => d.source.toUpperCase()),
                datasets: [{
                    data: sourceData.map(d => d.count),
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
                        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF',
                        '#4BC0C0', '#FF6384'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                    }
                }
            }
        });

        const hourlyCtx = document.getElementById('hourlyChart').getContext('2d');
        const hourlyData = ${JSON.stringify(hourlyData)};

        new Chart(hourlyCtx, {
            type: 'bar',
            data: {
                labels: Array.from({length: 24}, (_, i) => \`\${i}:00\`),
                datasets: [{
                    label: 'Activities',
                    data: hourlyData,
                    backgroundColor: '#007acc',
                    borderColor: '#005999',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    </script>
</body>
</html>`;

	return html;
}
