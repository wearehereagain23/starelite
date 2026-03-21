import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

// --- GLOBAL EVENT LISTENER FOR ALL ACTION BUTTONS ---
document.addEventListener('click', (e) => {
    // List of classes that should trigger the search modal
    const targetClasses = [
        'meet-btn',
        'gold-btn',
        'vip-btn',
        'ghost-white',
        'search-btn'
    ];

    // Check if the clicked element has one of the target classes 
    // OR is the "Book Talent" / "Buy Tickets" / "Start Booking" button
    const isTargetButton = targetClasses.some(cls => e.target.classList.contains(cls)) ||
        (e.target.classList.contains('btn') && !e.target.classList.contains('ghost'));

    // Special check for the "Find More Celebrities" ID and specific text-based buttons
    if (isTargetButton || e.target.id === 'findMoreBtn' || e.target.closest('#findMoreBtn')) {

        // Prevent default behavior (like navigating to seatgeek or internal anchors)
        e.preventDefault();
        openSearchModal();
    }
});

async function openSearchModal() {
    // 1. Fetch "Most Searched" from your DB
    const { data: trending, error } = await supabase
        .from('celeb')
        .select('name')
        .limit(6);

    const trendingHtml = (trending && trending.length > 0) ? trending.map(c =>
        `<span class="trending-chip" onclick="window.location.href='/dash/profile.html?name=${encodeURIComponent(c.name)}'">${c.name}</span>`
    ).join('') : '<p style="font-size:12px; color:gray">No trending talent found.</p>';

    // 2. Open SWAL Modal
    Swal.fire({
        title: 'Search Database',
        background: '#0f0f10',
        color: '#fff',
        confirmButtonColor: '#d4af37',
        customClass: {
            popup: 'swal-advanced-popup',
            confirmButton: 'swal-confirm-btn'
        },
        html: `
            <div style="text-align: left; margin-bottom: 20px;">
                <p style="font-size: 13px; color: var(--muted); margin-bottom: 10px;">TRENDING SEARCHES</p>
                <div class="trending-container">${trendingHtml}</div>
            </div>
            <div class="auth-field-group">
                <input type="text" id="wikiSearchInput" class="auth-input" placeholder="Enter celebrity name (e.g. Taylor Swift)">
            </div>
            <p id="searchError" style="color: #ff4d4d; font-size: 12px; margin-top: 5px; display: none;"></p>
        `,
        confirmButtonText: 'Verify & Search',
        showLoaderOnConfirm: true,
        preConfirm: async () => {
            const query = document.getElementById('wikiSearchInput').value.trim();
            if (!query) return Swal.showValidationMessage('Please enter a name');

            const isValid = await validateWithWiki(query);
            if (!isValid) {
                return Swal.showValidationMessage('Celebrity not found in global database. Contact management for assistance.');
            }
            return query;
        }
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = `/dash/profile.html?name=${encodeURIComponent(result.value)}`;
        }
    });
}

// 3. Wikipedia API Validation
async function validateWithWiki(name) {
    try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(name)}&format=json&origin=*`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.query.search.length > 0) {
            const topResult = data.query.search[0].title.toLowerCase();
            const inputName = name.toLowerCase();

            // Fuzzy match check
            if (topResult.includes(inputName) || inputName.includes(topResult)) {
                return true;
            }
        }
        return false;
    } catch (err) {
        console.error("Wiki API error:", err);
        return false;
    }
}