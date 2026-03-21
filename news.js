const GNEWS_API_KEY = '0041c5bece2ad8192981c540f62e02c9';

async function getDailyNews() {
    const CACHE_KEY = 'daily_buzz_news';
    const cachedData = localStorage.getItem(CACHE_KEY);
    const now = new Date().getTime();

    if (cachedData) {
        const { timestamp, articles } = JSON.parse(cachedData);
        if (now - timestamp < 86400000) return articles;
    }

    const articles = await fetchNews();
    localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: now, articles }));
    return articles;
}

async function fetchNews() {
    try {
        const url = `https://gnews.io/api/v4/top-headlines?category=entertainment&lang=en&apikey=${GNEWS_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        return data.articles || [];
    } catch (error) {
        return [];
    }
}

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
    let index = 0;
    setInterval(() => {
        index = (index + 1) % track.children.length;
        track.style.transform = `translateX(-${index * 100}%)`;
    }, 6000);
}

document.addEventListener('DOMContentLoaded', async () => {
    const news = await getDailyNews();
    renderNews(news);
});