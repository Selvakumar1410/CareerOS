/* =====================================================================
   CareerOS | Analytics Chart Component
   ===================================================================== */

let mainChartInstance = null;

function renderCharts(jobs) {
  const chartCanvas = document.getElementById("mainChart");
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext("2d");

  // Get counts per status
  const statuses = ["Applied", "Assessment", "Interview", "Offer", "Rejected"];
  const counts = statuses.map(s => jobs.filter(j => j.status === s).length);

  if (mainChartInstance) {
    mainChartInstance.destroy();
  }

  mainChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: statuses,
      datasets: [{
        label: 'Applications',
        data: counts,
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)'
        ],
        borderRadius: 8,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { stepSize: 1, color: '#64748b' },
          border: { display: false }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#64748b', font: { weight: '600' } },
          border: { display: false }
        }
      }
    }
  });
}
