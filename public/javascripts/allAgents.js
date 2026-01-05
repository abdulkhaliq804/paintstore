// --- Elements ---
const filterSelect = document.getElementById("filter");
const fromInput = document.getElementById("from");
const toInput = document.getElementById("to");
const filterForm = document.getElementById("filterForm") || document.querySelector('form');
const tbody = document.querySelector('tbody');

// ===================== 1. UPDATE TABLE WITHOUT RELOAD (SPA) =====================
async function updateAgentTable() {
    const formData = new URLSearchParams(new FormData(filterForm)).toString();
    
    // Visual Feedback
    tbody.style.opacity = '0.5';

    try {
        const res = await fetch(`/agents/all?${formData}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        });
        const data = await res.json();

        if (data.success) {
            // --- A. Update Stats Boxes (Handling Numbers Safely) ---
            const statsPs = document.querySelectorAll('.stat-box p');
            if (statsPs.length >= 4) {
                statsPs[0].innerText = data.agents.length;
                statsPs[1].innerText = `Rs ${Number(data.stats.totalPercentageAmount).toFixed(2)}`;
                statsPs[2].innerText = `Rs ${Number(data.stats.totalPercentageAmountGiven).toFixed(2)}`;
                statsPs[3].innerText = `Rs ${Number(data.stats.totalPercentageAmountLeft).toFixed(2)}`;
            }

            // --- B. Build Table Content ---
            let html = '';
            if (data.agents.length === 0) {
                html = `<tr><td colspan="6" class="no-data">No agents found for the selected filter.</td></tr>`;
            } else {
                data.agents.forEach(agent => {
                    const dateObj = new Date(agent.createdAt);
                    const dateStr = dateObj.toLocaleDateString('en-GB', { 
                        day: '2-digit', month: 'short', year: 'numeric',
                        timeZone: 'Asia/Karachi' 
                    });

                    html += `
                    <tr>
                        <td>${agent.agentName}</td>
                        <td>${agent.location || 'N/A'}</td>
                        <td>${agent.items ? agent.items.length : 0}</td>
                        <td>${dateStr}</td>
                        <td class="action-column">
                            <a href="/agents/view-agent/${agent._id}" style="text-decoration:none" class="view-btn">View Details</a>
                            ${data.role === "admin" ? `
                            <button type="button" class="delete-btn" data-id="${agent._id}">
                                Delete
                            </button>` : ''}
                        </td>
                    </tr>`;
                });
            }
            tbody.innerHTML = html;

            // --- C. Update URL ---
            window.history.pushState({}, '', `/agents/all?${formData}`);

            // --- D. Re-attach Listeners ---
            attachDeleteListeners();
        }
    } catch (err) {
        console.error("AJAX Error:", err);
    } finally {
        tbody.style.opacity = '1';
    }
}

// ===================== 2. DELETE AGENT (SPA STYLE) =====================
async function deleteAgent(agentId) {
    if (!confirm("Are you sure you want to delete this agent?")) return;

    try {
        const res = await fetch(`/agents/delete-agent/${agentId}`, {
            method: "DELETE",
        });
        const data = await res.json();

        if (data.success) {
            updateAgentTable(); 
        } else {
            alert(data.message || "Failed to delete agent");
        }
    } catch (err) {
        console.error("Delete Agent Error:", err);
        alert("Error deleting agent");
    }
}

// ===================== 3. HELPER FUNCTIONS =====================

function toggleDateInputs(value) {
    const isCustom = (value === "custom");
    if (fromInput) fromInput.style.display = isCustom ? "inline-block" : "none";
    if (toInput) toInput.style.display = isCustom ? "inline-block" : "none";
    
    const applyBtn = document.getElementById("applyBtn");
    if (applyBtn) applyBtn.style.display = isCustom ? "inline-block" : "none";
}

function attachDeleteListeners() {
    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.onclick = (e) => {
            e.preventDefault();
            const id = btn.getAttribute("data-id");
            deleteAgent(id);
        };
    });
}

// ===================== 4. INITIALIZATION =====================
// ===================== 4. INITIALIZATION (STRICT APPLY BUTTON ONLY) =====================
document.addEventListener("DOMContentLoaded", () => {
    
    // A. Dropdown Change (Sirf visibility ke liye, data fetch nahi karega)
    if (filterSelect) {
        filterSelect.addEventListener("change", () => {
            const selectedValue = filterSelect.value;
            toggleDateInputs(selectedValue);
            
            // Note: Humne yahan se updateAgentTable() nikaal diya hai
            console.log("Filter changed to: " + selectedValue + ". Click Apply to fetch data.");
        });
        
        // Page load par sirf inputs sahi dikhayein
        toggleDateInputs(filterSelect.value);
    }

    // B. Apply Button (Ab sirf ye hi data fetch karega)
    const applyBtn = document.getElementById("applyBtn");
    if (applyBtn) {
        applyBtn.addEventListener("click", (e) => {
            e.preventDefault();
            
            const selectedValue = filterSelect.value;

            // 1. Agar 'custom' hai to dates check karein
            if (selectedValue === "custom") {
                if (!fromInput.value || !toInput.value) {
                    alert("Please select both 'From' and 'To' dates for custom filter.");
                    return;
                }
            }
            
            // 2. Sirf yahan se hi table update hogi
            updateAgentTable();
        });
    }

    // C. Initial Listeners for Delete
    attachDeleteListeners();
});