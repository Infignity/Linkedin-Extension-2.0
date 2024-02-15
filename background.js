let Data;
let index = 0;
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {

    if (message.action === "contentToBackground") {
        const listName = message.data.listName;
        const linkedinPeople = message.data.linkedinPeople;

        if (linkedinPeople && listName) {

            const postData = {
                list_name: listName,
                data: linkedinPeople.map(item => ({
                    name: item.name,
                    href: item.href,
                    photo_url: item.photo_url,
                    organization_name: item.organization_name || '',
                    organization_linkedin_uid: item.organization_linkedin_uid || '',
                    title: item.title || '',
                    present_raw_address: item.present_raw_address || ''
                }))
            };

            // Send a POST request to the server
            fetch('https://mptools.azurewebsites.net/linkedin_salesnav', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData)
            })
                .then(response => {
                    if (response.ok) {
                        console.log('POST request successful');
                        console.log('Received data', { listName, linkedinPeople });
                    } else {
                        console.error('Unexpected response status:', response.status);
                    }
                })
                .catch(error => {
                    console.error('Error sending POST request', error);
                });
        } else {
            console.warn('Linkedinpeople data is not available');
        }
    }else if (message.action === "GetURLs") {
        console.log("it is working");
        fetch('https://mptools.azurewebsites.net/salesnav_links')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                console.log('Data:', data);
                Data = data;
                openurl();
            })
            .catch(error => {
                console.error('Error during fetch operation:', error);
            });
    } else if (message.action === "opennexturl") {
        openurl();
    }
});

function openurl() {
    if (Data && Data.length > 0) {
        if (Data.length > index) {
            let current_data = Data[index];
            console.log("Current Data:", current_data);
            console.log(index);
            console.log(current_data.salesnav_url);
            if (isLinkedInURL(current_data.salesnav_url)) {
            chrome.tabs.update({ url: current_data.salesnav_url }, (tab) => {
                setTimeout(() => {
                    if (chrome.runtime.lastError) {
                        console.log("Error  in opening Link");
                        console.error('Error opening tab:', chrome.runtime.lastError);
                    } else {
                        chrome.tabs.sendMessage(tab.id, { action: 'executeContentScript', listName: current_data.list_name });
                        index ++;
                    }
                }, 5000);
            });
           }
         else {
            console.log("Not  a Valid  linkedin URL");
            index = 0;
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'stop' });
              });
            }
        } else {
            console.log("No  More url  to open");
            index = 0;
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'stop' });
              });
        }
    } else {
        console.log("NO URL in the  Sheet to open");
    }
}

function isLinkedInURL(url) {
    return /^https:\/\/www\.linkedin\.com\//.test(url);
  }
