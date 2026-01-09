document.addEventListener('DOMContentLoaded', () => {
    console.log("JS Loaded and Ready!");

    // --- 1. View Button Listener ---
    document.querySelectorAll('.view-btn').forEach(button => {
        button.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            if (id) window.location.href = `/sales/bill/${id}`;
        });
    });

    // --- 2. Delete Button Listener ---
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            if (!id) return;

            if (confirm("⚠️ Are you sure you want to delete this bill?")) {
                try {
                    const response = await fetch(`/sales/delete-bill/${id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const result = await response.json();

                    if (result.success) {
                        alert("✅ Bill Deleted!");
                        location.reload();
                    } else {
                        alert("❌ Error: " + result.message);
                    }
                } catch (err) {
                    alert("❌ Server error.");
                }
            }
        });
    });

    // --- 3. Filter Logic (Custom Date Logic Fixed) ---
    const filterSelect = document.getElementById('filter');
    const fromInput = document.getElementById('from');
    const toInput = document.getElementById('to');
    const applyBtn = document.getElementById('apply');
    const agentSelect = document.getElementById('agentFilter');

    if (filterSelect) {
        filterSelect.addEventListener('change', () => {
            if (filterSelect.value === 'custom') {
                // Custom range par inputs dikhao
                if(fromInput) fromInput.style.display = 'inline-block';
                if(toInput) toInput.style.display = 'inline-block';
                if(applyBtn) applyBtn.style.display = 'inline-block';
            } else {
                // Baqi sab par form auto-submit kar do
                document.getElementById('filterForm').submit();
            }
        });
    }

    // Agent filter par bhi auto-submit
    if (agentSelect) {
        agentSelect.addEventListener('change', () => {
            document.getElementById('filterForm').submit();
        });
    }
});