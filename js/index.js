// /Users/abc/Documents/web/celeb 2/js/index.js

const API_BASE = 'https://celeb-address.vercel.app/api/landing';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch and render daily celebrities
    try {
        const celebRes = await fetch(`${API_BASE}/celebs`);
        const celebData = await celebRes.json();
        if (celebData.success) {
            renderCelebs(celebData.people);
        }
    } catch (err) {
        console.error('Failed to load celebrities:', err);
    }

    // 2. Fetch and render daily news
    try {
        const newsRes = await fetch(`${API_BASE}/news`);
        const newsData = await newsRes.json();
        if (newsData.success) {
            renderNews(newsData.articles);
        }
    } catch (err) {
        console.error('Failed to load news:', err);
    }

    // 3. Fetch and render daily events
    try {
        const eventRes = await fetch(`${API_BASE}/events`);
        const eventData = await eventRes.json();
        if (eventData.success) {
            renderEvents(eventData.events);
        }
    } catch (err) {
        console.error('Failed to load events:', err);
    }
});

// --- GLOBAL EVENT LISTENER FOR ACTION BUTTONS & SEARCH MODAL ---
document.addEventListener('click', async (e) => {
    const targetClasses = [
        'meet-btn',
        'gold-btn',
        'vip-btn',
        'ghost-white',
        'search-btn'
    ];

    const isTargetButton = targetClasses.some(cls => e.target.classList.contains(cls)) ||
        (e.target.classList.contains('btn') && !e.target.classList.contains('ghost'));

    if (isTargetButton || e.target.id === 'findMoreBtn' || e.target.closest('#findMoreBtn')) {
        e.preventDefault();
        await openSearchModal();
    }
});

async function openSearchModal() {
    // 1. Fetch "Most Searched" from backend database route
    let trendingHtml = '<p style="font-size:12px; color:gray">No trending talent found.</p>';
    try {
        const res = await fetch(`${API_BASE}/trending`);
        const data = await res.json();
        if (data.success && data.trending.length > 0) {
            trendingHtml = data.trending.map(c =>
                `<span class="trending-chip" onclick="window.location.href='/dash/profile.html?name=${encodeURIComponent(c.name)}'">${c.name}</span>`
            ).join('');
        }
    } catch (err) {
        console.error('Error fetching trending:', err);
    }

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

            const isValid = await validateWithBackendWiki(query);
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

// 3. Wikipedia Validation via Backend
async function validateWithBackendWiki(name) {
    try {
        const response = await fetch(`${API_BASE}/validate-wiki?name=${encodeURIComponent(name)}`);
        const data = await response.json();
        return data.valid;
    } catch (err) {
        console.error("Wiki validation error:", err);
        return false;
    }
}

// --- RENDER FUNCTIONS ---

const getCelebGrid = () => document.getElementById('featured')?.querySelector('.grid');

function renderCelebs(people) {
    const grid = getCelebGrid();
    if (!grid) return;

    grid.innerHTML = people.map(p => `
        <article class="card" onclick="navigateToProfile('${encodeURIComponent(p.name)}')" style="cursor: pointer;">
            <div class="media-container">
                <div class="media" style="background-image:url('${p.image}')"></div>
            </div>
            <div class="info">
                <div class="role-tag">${p.role}</div>
                <div class="name">${p.name}</div>
                <div class="bio">${p.bio}</div>
            </div>
        </article>
    `).join('');
}

window.navigateToProfile = (celebName) => {
    window.location.href = `/dash/profile.html?name=${celebName}`;
};

function renderNews(articles) {
    const track = document.getElementById('newsTrack');
    if (!track) return;

    track.innerHTML = articles.map(article => `
        <article class="news-card" style="cursor: default;">
            <div class="news-content">
                <div class="news-tag">Trending</div>
                <h4>${article.title}</h4>
                <p class="meta">${article.description}</p>
                <span class="source">Source: ${article.source.name}</span>
            </div>
        </article>
    `).join('');
    startCarousel();
}

function startCarousel() {
    const track = document.getElementById('newsTrack');
    if (!track || !track.children.length) return;
    let index = 0;
    setInterval(() => {
        index = (index + 1) % track.children.length;
        track.style.transform = `translateX(-${index * 100}%)`;
    }, 6000);
}

function renderEvents(events) {
    const container = document.querySelector('#events .events-list');
    if (!container) return;

    container.innerHTML = events.map(ev => `
        <article class="event-card" style="cursor: default;">
            <div class="event-img-container">
                <img src="${ev.image}" alt="${ev.name}">
            </div>
            <div class="event-info">
                <h3>${ev.name}</h3>
                <p class="event-date">📅 ${new Date(ev.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <p>🏟️ ${ev.venue}</p>
                <p class="location">📍 ${ev.city}</p>
            </div>
        </article>
    `).join('');
}