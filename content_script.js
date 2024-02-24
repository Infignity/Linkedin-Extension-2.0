const STORAGE_KEY = 'exlinkedinPeople';
let click = 2;
const maxpage = 101;
const scrollInterval = 2000;
const delayBeforeNextPage = 3000;
const loadPage = 7000;
const restart_time = 5000;
const max_restart = 20;
let restart = 0;

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    if (message.action === "executeContentScript") {
        clearLocalStorage(STORAGE_KEY);
        blurPage();
        setTimeout(() => {
            executeContentScript(message.listName);
        }, 3000);
    } else if (message.action === "start") {
        console.log("Starting");
        restart = 0;
        chrome.runtime.sendMessage({
            action: "GetURLs"
        });
    } else if (message.action === "stop") {
        console.log(message.message);
        hideProcessingOverlay();
    }
});

function executeContentScript(listName) {
   

    const resultsContainer = document.querySelector('#search-results-container');
    if (resultsContainer) {
        const totalScrolls = document.querySelectorAll(".artdeco-list__item.pl3.pv3").length;
        console.log('List Name:', listName);
        console.log("Total Scrolls: ", totalScrolls);

        let scrollsCompleted = 0;

        function handleScroll() {
            resultsContainer.scrollBy(0, 250);
            console.log("Scrolled:", scrollsCompleted + 1, "times");

            scrollsCompleted++;

            if (scrollsCompleted === totalScrolls) {
                fetchLinkedInPeople(listName);
            }
        }

        for (let i = 0; i < totalScrolls; i++) {
            setTimeout(handleScroll, i * scrollInterval + getRandomDelay());
        }
    } else {
        console.log("Page load issue. Please Wait it will automatically  restart");
        if (restart < max_restart) {
            setTimeout(() => {
                executeContentScript(listName);
            }, restart_time);
            restart++;
        } else {
            console.log("Network issue. Please check your network");
            hideProcessingOverlay();
        }
    }
}

function fetchLinkedInPeople(listName) {
    const profiles = document.querySelectorAll('.flex.flex-column');

    const linkedinPeople = Array.from(profiles)
        .filter(profile => {
            const name = profile.querySelector('.artdeco-entity-lockup__title span')?.textContent?.trim();
            return name !== undefined;
        })
        .map(profile => {
            const profileLink = profile.querySelector('.artdeco-entity-lockup__title a')?.getAttribute('href');
            const name = profile.querySelector('.artdeco-entity-lockup__title span')?.textContent.trim();
            const photoUrl = profile.querySelector('.artdeco-entity-lockup__image img')?.getAttribute('src');
            const titleElement = profile.querySelector('.artdeco-entity-lockup__subtitle span[data-anonymize="title"]');
            const title = titleElement?.textContent?.trim();
            const orgLinkElement = profile.querySelector('.artdeco-entity-lockup__subtitle a');
            const organizationName = orgLinkElement?.textContent.trim();
            const organizationLinkedInUid = orgLinkElement?.getAttribute('href')?.match(/\/company\/(\d+)/)?.[1];

            const locationElement = profile.querySelector('.artdeco-entity-lockup__caption');
            const presentRawAddress = locationElement?.textContent.trim();

            return {
                href: `https://www.linkedin.com${profileLink}`,
                name,
                photo_url: photoUrl,
                organization_name: organizationName,
                organization_linkedin_uid: organizationLinkedInUid,
                title,
                present_raw_address: presentRawAddress,
            };
        });

    console.log("LinkedIn people captured:", linkedinPeople);

    updateLocalStorage(linkedinPeople);

    const nextPageButton = document.querySelector('.artdeco-pagination__button--next');

    function loadNextPage() {
        if (click < maxpage) {
            nextPageButton.click();
            setTimeout(() => {
                executeContentScript(listName);
                click++;
            }, loadPage);
            console.log("Page", click);
        } else {
            console.log("Reached Maximum Pages.");
            nexturl(listName);
        }
    }

    if (nextPageButton && !nextPageButton.hasAttribute('disabled')) {
        console.log("We will go to next page in 5 seconds")
        setTimeout(loadNextPage, delayBeforeNextPage);
    } else {
        console.log("No more pages to load.");
        console.log("Going to next url please wait for 5 seconds");
        nexturl(listName);
    }
}

function updateLocalStorage(data) {
    const existingData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const mergedData = JSON.stringify([...existingData, ...data]);
    localStorage.setItem(STORAGE_KEY, mergedData);
}

function getRandomDelay() {
    return Math.floor(Math.random() * 1000);
}

function blurPage() {
    showProcessingOverlay();
}

function clearLocalStorage(key) {
    if (localStorage.getItem(key)) {
        console.log(`Clearing ${key} from local storage.`);
        localStorage.removeItem(key);
    }
}

function showProcessingOverlay() {
    const processingOverlay = document.createElement('div');
    processingOverlay.classList.add('processing-overlay');

    const processingText = document.createElement('div');
    processingText.classList.add('processing-text');
    processingText.textContent = 'Processing...';

    processingOverlay.appendChild(processingText);
    document.body.appendChild(processingOverlay);
}

function hideProcessingOverlay() {
    
    const processingOverlay = document.querySelector('.processing-overlay');
    if (processingOverlay) {
        processingOverlay.remove();
    }
}

function saveDataToFile(data, listName) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const timestamp = new Date().toISOString().replace(/[-:]/g, '');
    const filename = `${listName}_${timestamp}.json`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

function nexturl(listName) {
    const linkedinPeople = JSON.parse(localStorage.getItem(STORAGE_KEY));
    console.log('Received data in background:', { listName, linkedinPeople });

    saveDataToFile(linkedinPeople, listName);

    chrome.runtime.sendMessage({
        action: "contentToBackground",
        data: {
            listName,
            linkedinPeople
        }
    });

    setTimeout(() => {
        chrome.runtime.sendMessage({
            action: "opennexturl",
        });
        
    }, 5000);
}
