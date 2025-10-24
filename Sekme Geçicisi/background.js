let activeOverlayTabId = null;

// Bir sekme arka planda oluşturulduğunda tetiklenir
chrome.tabs.onCreated.addListener(function (tab) {
    if (!tab.active) {
        showNotification(tab.id);
    }
});

// Bildirim gösterme ana fonksiyonu
function showNotification(newTabId) {
    // Mevcut bir bildirim varsa, önce onu kaldır
    if (activeOverlayTabId) {
        removeExistingOverlay();
    }
    activeOverlayTabId = newTabId;

    // Aktif sekmeyi bul ve bildirimi orada göster
    chrome.tabs.query({ active: true, currentWindow: true }, function (activeTabs) {
        if (activeTabs.length > 0) {
            chrome.scripting.executeScript({
                target: { tabId: activeTabs[0].id },
                func: createOverlay,
                args: [newTabId]
            });
        }
    });
}

// Sayfaya bildirimi (overlay) enjekte eden fonksiyon
// Bu fonksiyon doğrudan tarayıcı sayfasında çalışır
function createOverlay(newTabId) {
    // İkonu SVG olarak tanımlıyoruz, böylece ek dosya gerekmiyor
    const tabIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 7h-9a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"></path>
            <path d="M4 3h9a2 2 0 0 1 2 2v10"></path>
        </svg>
    `;

    // Eski bir bildirim kalmışsa onu temizle
    const existingOverlay = document.getElementById('newTabSwitcherOverlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'newTabSwitcherOverlay';
    
    // --- YENİ TASARIM ---
    Object.assign(overlay.style, {
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translate(-50%, 100px)', // Başlangıçta ekranın altında
        width: '340px',
        maxWidth: '90vw',
        backgroundColor: '#016ADD',
        color: 'white',
        padding: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontFamily: `'Segoe UI', 'Roboto', 'Arial', sans-serif`,
        zIndex: '2147483647', // En üstte olması için
        cursor: 'pointer',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        background: 'linear-gradient(45deg, #016ADD, #0045A2)',
        opacity: '0',
        transition: 'transform 0.4s ease-out, opacity 0.4s ease-out'
    });

    const contentWrapper = document.createElement('div');
    Object.assign(contentWrapper.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    });

    contentWrapper.innerHTML = tabIconSVG; // İkonu ekle

    const text = document.createElement('span');
    // Dil dosyalarından metni çekmek için runtime mesajı kullanıyoruz
    text.innerText = chrome.i18n.getMessage("notificationText"); 
    text.style.fontSize = '16px';

    const switchButton = document.createElement('span');
    switchButton.innerText = chrome.i18n.getMessage("switchToButtonText");
    Object.assign(switchButton.style, {
        fontWeight: 'bold',
        fontSize: '14px',
        padding: '6px 12px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '8px'
    });

    contentWrapper.appendChild(text);
    overlay.appendChild(contentWrapper);
    overlay.appendChild(switchButton);

    document.body.appendChild(overlay);
    
    // Animasyonla ekrana getirme
    setTimeout(() => {
        overlay.style.transform = 'translateX(-50%)';
        overlay.style.opacity = '1';
    }, 50);

    // Tıklama veya dokunma olayı
    const switchTabHandler = () => {
        chrome.runtime.sendMessage({ action: 'switchTab', tabId: newTabId });
        removeWithAnimation();
    };
    overlay.addEventListener('click', switchTabHandler);
    overlay.addEventListener('touchstart', switchTabHandler);

    // Animasyonla kaldırma fonksiyonu
    const removeWithAnimation = () => {
        overlay.style.transform = 'translate(-50%, 100px)';
        overlay.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 400); // Animasyon süresi kadar bekle
    };

    // 6 saniye sonra otomatik olarak kaldır
    setTimeout(removeWithAnimation, 6000);
}

// Mevcut bildirimi sayfadan kaldıran yardımcı fonksiyon
function removeExistingOverlay() {
    chrome.tabs.query({ active: true, currentWindow: true }, function (activeTabs) {
        if (activeTabs.length > 0) {
            chrome.scripting.executeScript({
                target: { tabId: activeTabs[0].id },
                func: () => {
                    const existingOverlay = document.getElementById('newTabSwitcherOverlay');
                    if (existingOverlay) {
                        // Animasyonla kaldırma
                        existingOverlay.style.transform = 'translate(-50%, 100px)';
                        existingOverlay.style.opacity = '0';
                        setTimeout(() => existingOverlay.remove(), 400);
                    }
                }
            });
        }
    });
}

// Sekme değiştirme isteğini dinle
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'switchTab' && request.tabId) {
        chrome.tabs.update(request.tabId, { active: true });
    }
});
