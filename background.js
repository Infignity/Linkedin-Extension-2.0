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
    }
});
