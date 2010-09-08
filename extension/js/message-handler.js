// Copyright (c) 2009, Scott Ferguson
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the software nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
// 
// THIS SOFTWARE IS PROVIDED BY SCOTT FERGUSON ''AS IS'' AND ANY
// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL SCOTT FERGUSON BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 * External message event listener
 *
 */
chrome.extension.onConnectExternal.addListener(function(port) {
    port.onMessage.addListener(function(data) {
        switch (data.message) {
            case 'GetForumsJumpList':
            case 'GetSALRSettings':
                port.postMessage(getPageSettings());
                break;
            case 'ChangeSALRSetting':
                localStorage.setItem(data.option, data.value);
                break;
        }
    });
});

/**
 * Message event listener so that we can talk to the content-script
 *
 */
chrome.extension.onConnect.addListener(function(port) {
    port.onMessage.addListener(function(data) {
        switch (data.message) {
            case 'OpenSettings':
                onToolbarClick();
                break;
            case 'ChangeSetting':
                localStorage.setItem(data.option, data.value);
                break;
            case 'OpenTab':
                openNewTab(data.url);
                break;
            case 'ShowPageAction':
                // Register the tab with the tagging page action
                chrome.pageActions.enableForTab("forums_jump_list",
                                                { 
                                                    tabId: port.tab.id,
                                                    url: port.tab.url,
                                                    title: "Click to open forum jump list",
                                                    iconId: 0
                                                });

                break;
            case 'GetPageSettings':
            case 'GetSALRSettings':
            case 'GetForumsJumpList':
                port.postMessage(getPageSettings());
                break;
            case 'ChangeSALRSetting':
                localStorage.setItem(data.option, data.value);
            case 'UploadWaffleImages':
                uploadWaffleImagesFile(data);
                break;
            case 'log':
            default:
                console.log(data);
		}
    });
});

// New assoc array for storing default settings.
var defaultSettings = [];
defaultSettings['userQuote']                    = '#a2cd5a';
defaultSettings['darkRead']                     = '#6699cc';
defaultSettings['lightRead']                    = '#99ccff';
defaultSettings['darkNewReplies']               = '#99cc99';
defaultSettings['lightNewReplies']              = '#ccffcc';
defaultSettings['youtubeHighlight']             = '#ff00ff';
defaultSettings['displayConfigureSalr']         = 'true';
defaultSettings['highlightFriendsColor']        = '#f2babb';
defaultSettings['highlightSelfColor']           = '#f2babb';
defaultSettings['highlightAdminColor']          = '#ff7256';
defaultSettings['highlightModeratorColor']      = '#b4eeb4';
defaultSettings['inlinePostCounts']             = 'false';
defaultSettings['displayCustomButtons']         = 'true';
defaultSettings['highlightOPColor']             = '#fff2aa';
defaultSettings['displayPageNavigator']         = 'true';
defaultSettings['userNotesEnabled']             = 'true';
defaultSettings['salrInitialized']              = 'true';
defaultSettings['topPurchaseAcc']               = 'true';
defaultSettings['topPurchasePlat']              = 'true';
defaultSettings['topPurchaseAva']               = 'true';
defaultSettings['topPurchaseOtherAva']          = 'true';
defaultSettings['topPurchaseArchives']          = 'true';
defaultSettings['topPurchaseNoAds']             = 'true';
defaultSettings['topPurchaseUsername']          = 'true';
defaultSettings['topPurchaseNonProfAd']         = 'true';
defaultSettings['topPurchaseForProfAd']         = 'true';
defaultSettings['topPurchaseEmoticon']          = 'true';
defaultSettings['topPurchaseSticky']            = 'true';
defaultSettings['topPurchaseGiftCert']          = 'true';
defaultSettings['topSAForums']                  = 'true';
defaultSettings['topSearch']                    = 'true';
defaultSettings['topUserCP']                    = 'true';
defaultSettings['topPrivMsgs']                  = 'true';
defaultSettings['topForumRules']                = 'true';
defaultSettings['topSaclopedia']                = 'true';
defaultSettings['topGloryhole']                 = 'true';
defaultSettings['topLepersColony']              = 'true';
defaultSettings['topSupport']                   = 'true';
defaultSettings['topLogout']                    = 'true';
defaultSettings['showPurchases']                = 'true';
defaultSettings['showNavigation']               = 'true';


/**
 * Event handler for clicking on the toolstrip logo
 *
 * @param element - Toolstrip element
 */
function onToolbarClick() {
	chrome.tabs.create({url:chrome.extension.getURL('settings.html')});
}

/**
 * Opens a new tab with the specified URL
 *
 *
 */
function openNewTab(aUrl) {
    chrome.tabs.create({url: aUrl});
}

/**
 * Sets up default preferences for highlighting and menus only
 *
 */
function setupDefaultPreferences() {
    // New, more scalable method for setting default prefs.
    for ( var key in defaultSettings ) {
        if ( localStorage.getItem(key) == undefined ) {
            localStorage.setItem(key, defaultSettings[key]);
        }
    }
}

/**
 * Returns page settings to local and remote message requests
 *
 */
function getPageSettings() {
    // Don't wipe the settings made by previous versions
    if (localStorage.getItem('username')) {
        localStorage.setItem('salrInitialized', 'true');
    }

    // If we don't have stored settings, set defaults
    setupDefaultPreferences();

    fixSettings();

    var response = {};

    for ( var index in localStorage ) {
        response[index] = localStorage.getItem(index);
    }

    return response;
} 

/**
 * Update settings from old versions
 *
 */
function fixSettings() {
    if (localStorage.getItem('disableCustomButtons') == 'true') {
        localStorage.setItem('displayCustomButtons', 'false');
        localStorage.removeItem('disableCustomButtons');
    } else if (localStorage.getItem('disableCustomButtons') == 'false') {
        localStorage.setItem('displayCustomButtons', 'true');
        localStorage.removeItem('disableCustomButtons');
    }
    if (localStorage.getItem('ignore_bookmark_star')) {
        localStorage.setItem('ignoreBookmarkStar', localStorage.getItem('ignore_bookmark_star'));
        localStorage.removeItem('ignore_bookmark_star');
    }
    if (localStorage.getItem('highlightCancer')) {
        localStorage.setItem('fixCancer', localStorage.getItem('highlightCancer'));
        localStorage.removeItem('highlightCancer');
    }
}

/**
 * We handle the waffle images upload here so that we can leverage the cross-XHR
 * permissions in Chrome.
 *
 */
function uploadWaffleImagesFile(param) {
    var data = {
        files: param.files,
        params: {
            mode: 'file',
            tg_format: 'xml'
        },
        url: 'http://waffleimages.com/upload',
    };

    upload(data);
    /*
    sendMultipleFiles({
        url: 'http://waffleimages.com/upload',
        files: param.files,
        onloadstart:function(){
        },
        onprogress:function(rpe){
        },
        onload:function(rpe, xhr){
            console.log(xhr.responseText);
        },
        onerror:function(){
        }
    });
    */
}

function getBuilder(filename, filedata, boundary, data) {
    var dashdash = '--',
        crlf = '\r\n',
        builder = '';

    for (var i in data.params) {
        builder += dashdash;
        builder += boundary;
        builder += crlf;
        builder += 'Content-Disposition: form-data; name="'+i+'"';
        builder += crlf;
        builder += data.params[i];
        builder += crlf;
    }
    
    builder += dashdash;
    builder += boundary;
    builder += crlf;
    builder += 'Content-Disposition: form-data; name="file"';
    builder += '; filename="' + filename + '"';
    builder += crlf;

    builder += 'Content-Type: application/octet-stream';
    builder += crlf;
    builder += crlf; 

    builder += filedata;
    builder += crlf;

    builder += dashdash;
    builder += boundary;
    builder += crlf;
    
    builder += dashdash;
    builder += boundary;
    builder += dashdash;
    builder += crlf;
    return builder;
}

function upload(data) {
    stop_loop = false;
    if (!data.files) {
        console.log('Not data.files!');
        return false;
    }
    var len = data.files.length;

    if (len > 25) {
        console.log("Too many!");
        return false;
    }

    var send = function(e) {
        var xhr = new XMLHttpRequest(),
            upload = xhr.upload,
            file = e.file,
            index = e.index,
            start_time = new Date().getTime(),
            boundary = '------multipartformboundary' + (new Date).getTime(),
            builder = getBuilder(file.name, e.result, boundary, data);

        upload.index = index;
        upload.file = file;
        upload.downloadStartTime = start_time;
        upload.currentStart = start_time;
        upload.currentProgress = 0;
        upload.startData = 0;

        console.log('Starting to transfer');

        xhr.open("POST", data.url, true);
        xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' 
            + boundary);

        xhr.send(builder);  

        console.log(xhr);

        xhr.onload = function() { 
            console.log(xhr);
            if (xhr.responseText) {
            console.log(xhr.responseText);
            if (result === false) stop_loop = true;
            }
        };
    };

    for (var i=0; i<len; i++) {
        if (stop_loop) return false;
        try {
            if (i === len) return;
            var reader = new FileReader(),
                max_file_size = 1048576;

            reader.index = i;
            reader.file = data.files[i];
            reader.len = len;
            if (reader.file.size > max_file_size) {
                console.log("Too big!");
                return false;
            }

            reader.onloadend = send;
            // TODO: Per the W3C spec readAsBinaryString should set the result property
            // of the FileReader object to a binary string.  This is not currently happening
            // in Chrome 6.
            reader.readAsBinaryString(data.files[i]);
        } catch(err) {
            console.log(err);
            return false;
        }
    }
}
