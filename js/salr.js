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

var settings = {};
var pageNavigator = null;
var quickReply = null;
var mouseGesturesController = {};

/**
 * Event listener for when a user enters their username within
 * the extension UI.  Currently this only works when you're
 * viewing forums.somethingawful.com since we don't have any
 * events that can be fired on a localStorage event that occurs
 * within the extension.
 *
 */
var port = chrome.extension.connect();

port.onMessage.addListener(function(data) {

    settings = data;
    
    // Update the styles now that we have
    // the settings
    updateStyling();
	modifyImages();

    switch (findCurrentPage()) {
        case '':
        case 'index.php':
            if (settings.highlightModAdmin == 'true') {
                skimModerators();
            }

            break;
        case 'forumdisplay.php':
        case 'showthread.php':
            if (settings.inlineVideo == 'true') {
                inlineYoutubes();
            }

            if (settings.displayPageNavigator == 'true') {
                pageNavigator = new PageNavigator();
            }

            updateForumsList();
            
            if (settings.highlightFriends == 'true') {
                highlightFriendPosts();    
            }
        
            if (settings.highlightOP == 'true') {
                highlightOPPosts();    
            }

            if (settings.highlightSelf == 'true') {
                highlightOwnPosts();
            }

            if (settings.highlightModAdmin == 'true') {
                skimModerators();
                highlightModAdminPosts();
            }

            if (settings.enableUserNotes == 'true') {
                displayUserNotes();
            }

            if (settings.boxQuotes == 'true') {
                boxQuotes();
            }

            if (settings.highlightOwnUsername == 'true') {
                highlightOwnUsername();
            }

            if (settings.highlightOwnQuotes == 'true') {
                highlightOwnQuotes();
            }

            displayBanHistoryLink();

            displaySinglePostLink();

            if (settings.enableQuickReply == 'true') {
                if (settings.forumPostKey) {
                    quickReply = new QuickReplyBox(settings.forumPostKey);
                    bindQuickReply();
                }
            }
            
            if (settings.enableThreadNotes == 'true') {
                threadNotes();
            }

            renderWhoPostedInThreadLink();

            break;
        case 'newreply.php':
            if (!settings.forumPostKey) {
                findFormKey();
            }
            
            if (settings.qneProtection == 'true') {
                quoteNotEditProtection();
            }

            break;
        case 'usercp.php':
            updateUsernameFromCP();
            updateFriendsList();
            renderOpenUpdatedThreadsButton();
            if (settings.highlightModAdmin == 'true') {
                highlightModAdminPosts();
            }

            break;
        case 'bookmarkthreads.php':
            renderOpenUpdatedThreadsButton();
            if (settings.highlightModAdmin == 'true') {
                highlightModAdminPosts();
            }

            break;
    }

    if (pageNavigator) {
        pageNavigator.display();
    }

    if (settings.enableMouseGestures == 'true') {
        mouseGesturesController = new MouseGesturesController();
    }

    if (settings.enableKeyboardShortcuts == 'true') {
        hotKeyManager = new HotKeyManager();
    }

    if (settings.displayOmnibarIcon == 'true') {
        // Display the page action
        port.postMessage({
            'message': 'ShowPageAction'
        });
    }
});

// Request the username from the extension UI
port.postMessage({
    'message': 'GetPageSettings'
});

function openSettings() {
    port.postMessage({'message': 'OpenSettings'});
}

// Since we have to wait to receive the settings from the extension,
// stash the styling logic in it's own function that we can call
// once we're ready
function updateStyling() {
    var newPosts = false;
    var newPostCount = 0;

    // Iterate over each .thread .seen td element.  This is necessary
    // so we can track each thread's designated color (read/not read)
    jQuery('tr.thread.seen').each(function() {
        if (settings.disableCustomButtons == 'false' || !settings.disableCustomButtons) {
            // Re-style the "mark unread" link
            jQuery(this).find('a.x').each(function() {
                // Set the image styles
                jQuery(this).css("background", "none");
                jQuery(this).css("background-image", "url('" + chrome.extension.getURL("images/") + "unvisit.png')");
                jQuery(this).css("height", "16px");
                jQuery(this).css("width", "14px");

                // Remove the 'X' from the anchor tag
                jQuery(this).html('');
            });
        }

        // Re-style the new post count link
        jQuery(this).find('a.count').each(function() {
            // If we find an a.count, then we have new posts
            newPosts = true;
            newPostCount = jQuery(this).html();

            if (settings.disableCustomButtons == 'false' || !settings.disableCustomButtons) {
                // Remove the left split border
                jQuery(this).css("border-left", "none");

                // Resize, shift, and add in the background image
                jQuery(this).css("width", "7px");
                jQuery(this).css("height", "16px");
                jQuery(this).css("padding-right", "11px");
                jQuery(this).css("background-image", "url('" + chrome.extension.getURL("images/") + "lastpost.png')");

                // Remove the count from the element
                jQuery(this).html('');
            }
        });
        
        if (settings.disableCustomButtons == 'false' || !settings.disableCustomButtons) {
            // Eliminate last-seen styling
            jQuery(this).find('.lastseen').each(function() {
                jQuery(this).css("background", "none");
                jQuery(this).css("border", "none");
            });
        }

        // Don't do inline post counts if the user has custom jump buttons disabled
        if (settings.inlinePostCounts == 'true' && (settings.disableCustomButtons == 'false' || !settings.disableCustomButtons)) {
            jQuery(this).find('div.lastseen').each(function() {
                // Add in number of new replies
                if (newPostCount != 0) {
                    var currentHtml = jQuery(this).html();
        
                    // Strip HTML tags
                    newPostCount = parseInt(newPostCount.replace(/(<([^>]+)>)/ig, ""));
                    // Set the HTML value
                    jQuery(this).html("<div style='font-size: 12px; float: left; margin-top: 4px; padding-right: 4px;'>(" + newPostCount + ")</div>" + currentHtml);
                }
            });
        }

        if (!newPosts && settings.displayNewPostsFirst == 'true') {
            var currentThread = jQuery(this);

            currentThread.parent().append(currentThread);
        }
	
    	// If the thread has new posts, display the green shade,
    	// otherwise show the blue shade
    	var darkShade = (newPosts) ? settings.darkNewReplies : settings.darkRead;
    	var lightShade = (newPosts) ? settings.lightNewReplies : settings.lightRead;

    	// Thread icon, author, view count, and last post
    	jQuery(this).children('td.icon, td.author, td.views, td.lastpost').each(function() {
    		jQuery(this).css({ "background-color" : darkShade, 
    						   "background-image" : "url('" + chrome.extension.getURL("images/") + "gradient.png')",
    						   "background-repeat" : "repeat-x"
    						 });
    	});

    	// Thread title, replies, and rating
    	jQuery(this).find('td.title, td.replies, td.rating').each(function() {
    		jQuery(this).css({ "background-color" : lightShade, 
    						   "background-image" : "url('" + chrome.extension.getURL("images/") + "gradient.png')",
    						   "background-repeat" : "repeat-x"
    						 });
    	});

        if (settings.inlinePostCounts == 'false') {
            // Display number of new replies for each thread
            jQuery(this).find('td.replies').each(function() {
                // Add in number of new replies
                if (newPostCount != 0) {
                    var currentHtml = jQuery(this).html();
        
                    // Strip HTML tags
                    newPostCount = parseInt(newPostCount.replace(/(<([^>]+)>)/ig, ""));
                    // Set the HTML value
                    jQuery(this).html(currentHtml + "<br /><div style='font-size: 12px;'>(" + newPostCount + ")</div>");
                }
            });
        }

        // Reset post counts
    	newPosts = false;
    	newPostCount = 0;
    });
	
	if(settings.displayConfigureSalr == 'true') {
		jQuery('#navigation li.first').next('li').next('li').after(" - <a id='configure' href='#'>Configure SALR</a>");
	}
	
	jQuery('#configure').click(function() {
		openSettings();
	});
    
    // If we need to, move all unseen posts to the end of the list
    if (settings.displayNewPostsFirst =='true') {
        jQuery('tr.thread').each(function() {
            if (jQuery(this).attr('class') == 'thread') {
                var currentThread = jQuery(this);

                currentThread.parent().append(currentThread);
            }
        });
    }   

    
    // Hide header/footer links
    if (settings.hideHeaderLinks == 'true') {
        jQuery('div#globalmenu').each(function() {
            jQuery(this).html('');
            jQuery(this).css('height', '0px');
        });

        jQuery('ul#nav_purchase').each(function() {
            jQuery(this).html('');
            jQuery(this).css('height', '0px');
        });
    }

    // Hide the advertisements
    if (settings.hideAdvertisements == 'true') {
        jQuery('div.oma_pal').each(function() {
            jQuery(this).remove();
        });

        jQuery('div#ad_banner_user').each(function() {
            jQuery(this).remove();
        });
    }
}

function modifyImages() {

	// Replace Links with Images
	if (settings.replaceLinksWithImages == 'true') {

		var subset = jQuery('.postbody a');

		//NWS/NMS links
		if(settings.dontReplaceLinkNWS == 'true')
		{
			subset = subset.not(".postbody:has(img[title=':nws:']) a").not(".postbody:has(img[title=':nms:']) a");
		}

		//
		if(settings.dontReplaceLinkSpoiler == 'true') {
			subset = subset.not('.bbc-spoiler a');	
		}

		if(settings.dontReplaceLinkRead == 'true') {
			subset = subset.not('.seen1 a').not('.seen2 a');
		}

		subset.each(function() {

			var match = jQuery(this).attr('href').match(/https?\:\/\/(?:[-_0-9a-zA-Z]+\.)+[a-z]{2,6}(?:\/[^/#?]+)+\.(?:jpe?g|gif|png|bmp)/);
			if(match != null) {
				jQuery(this).after("<img src='" + match[0] + "' />");
				jQuery(this).remove();
			}
		});
	}

	// Replace inline Images with Links
	if (settings.replaceImagesWithLinks == 'true') {
		var subset = jQuery('.postbody img');
		
		if(settings.replaceImagesReadOnly == 'true') {
			subset = subset.filter('.seen1 img, .seen2 img');
		}
		
		//if(settings.dontReplaceEmoticons == 'true') {
			subset = subset.not('img[src*=http://i.somethingawful.com/forumsystem/emoticons/]');
			subset = subset.not('img[src*=http://fi.somethingawful.com/images/smilies/]');
		//}

		subset.each(function() {
			var source = jQuery(this).attr('src');
			jQuery(this).after("<a href='" + source + "'>" + source + "</a>");
			jQuery(this).remove();
		});
	}

	if (settings.restrictImageSize == 'true') {
		jQuery('.postbody img').css({'max-width':'800px'});
	}
}

function skimModerators() {
    var modList;
    var modupdate = false;
    if (settings.modList == null) {
        // Seed administrators. Is there a list for them?
        modList = { "12831" : {'username' :  'elpintogrande', 'mod' : 'A'},
                    "16393" : {'username' :  'Fistgrrl', 'mod' : 'A'},
                    "17553" : {'username' :  'Livestock', 'mod' : 'A'},
                    "22720" : {'username' :  'Ozma', 'mod' : 'A'},
                    "23684" : {'username' :  'mons all madden', 'mod' : 'A'},
                    "24587" : {'username' :  'hoodrow trillson', 'mod' : 'A'},
                    "27691" : {'username' :  'Lowtax', 'mod' : 'A'},
                    "51697" : {'username' :  'angerbotSD', 'mod' : 'A'},
                    "62392" : {'username' :  'Tiny Fistpump', 'mod' : 'A'},
                    "114975" : {'username' : 'SA Support Robot', 'mod' : 'A'},
                    "137488" : {'username' : 'Garbage Day', 'mod' : 'A'},
                    "147983" : {'username' : 'Peatpot', 'mod' : 'A'},
                    "158420" : {'username' : 'Badvertising', 'mod' : 'A'},
                   };
        modupdate = true;
    } else {
        modList = JSON.parse(settings.modList);
    }

    // TODO: How can you tell if a mod has been demodded?

    // Moderator list on forumdisplay.php
    jQuery('div#mods > b > a').each(function() {
        var userid = jQuery(this).attr('href').split('userid=')[1];
        var username = jQuery(this).html();
        if (modList[userid] == null) {
            modList[userid] = {'username' : username, 'mod' : 'M'};
            modupdate = true;
        } else if (modList[userid].username != username) {
            modList[userid].username = username;
            modupdate = true;
        }
    });

    // Moderator lists on index.php
    jQuery('td.moderators > a').each(function() {
        var userid = jQuery(this).attr('href').split('userid=')[1];
        var username = jQuery(this).html();
        if (modList[userid] == null) {
            modList[userid] = {'username' : username, 'mod' : 'M'};
            modupdate = true;
        } else if (modList[userid].username != username) {
            modList[userid].username = username;
            modupdate = true;
        }
    });

    if (modupdate) {
        port.postMessage({ 'message': 'ChangeSetting',
                           'option' : 'modList',
                           'value'  : JSON.stringify(modList) });
    }
}

function inlineYoutubes() {
	//sort out youtube links
	jQuery('.postbody a[href*="youtube.com"]').each(function() {
			jQuery(this).css("background-color", settings.youtubeHighlight).addClass("salr-video");
	});
	
	jQuery(".salr-video").toggle(function(){ 
			var match = jQuery(this).attr('href').match(/^http\:\/\/((?:www|[a-z]{2})\.)?youtube\.com\/watch\?v=([-_0-9a-zA-Z]+)/); //get youtube video id
			var videoId = match[2];

			jQuery(this).after("<p><embed class = 'salr-player' /></p>"); //make new embed for video
			jQuery(".salr-player").attr("id",videoId);
			jQuery(".salr-player").attr("src","http://www.youtube.com/v/" + videoId);
			jQuery(".salr-player").attr("width","450");
			jQuery(".salr-player").attr("height","370");
			jQuery(".salr-player").attr("type","application/x-shockwave-flash");
			jQuery(".salr-player").attr("wmode","transparent");

			return false;
		},
		function() {
			// second state of toggle destroys player. should add a check for player existing before 
            // destroying it but seing as it's the second state of a toggle i'll leave it for now. 
			jQuery(this).next().remove();
		}
	);
}

/**
 * Display Single Post View link under a users post
 *
 *
 */
function displaySinglePostLink() {
    var getPostID = function(element) {
        return jQuery('a[href^=#post]', element).attr('href').split('#post')[1];
    };

    jQuery('td.postdate').each( function() {
        jQuery('a[href^=#post]', this).before('<a href="http://forums.somethingawful.com/showthread.php?action=showpost&postid='+getPostID(jQuery(this))+'">1</a> ');
    });
}

/**
 * Display Ban History link under a users post
 *
 *
 */
function displayBanHistoryLink() {
    
    var getUserID = function(element) {
        var queryString = jQuery('li:first > a', element).attr('href');

        // Holy hardcore string manipulation, Batman!
        return (queryString.split('&')[1]).split('=')[1];
    };

    jQuery('ul.profilelinks').each(function() {
        jQuery(this).append('<li><a href="http://forums.somethingawful.com/banlist.php?userid=' + getUserID(jQuery(this)) + '">Ban History</a></li>');
    });
}

/**
 * Open the list of who posted in a thread
 *
 */
function renderWhoPostedInThreadLink() {
    jQuery('div.threadbar.top').each( function() {
        var headerHTML = jQuery(this).html();
        var updatedHTML = '<div id="open-who-posted"' +
                          '     style="float:left; ' +
                          '            cursor:pointer; ' +
                          '            text-decoration: underline;">' +
                          'Who Posted</div>'+headerHTML;
        jQuery(this).html(updatedHTML);

        jQuery('#open-who-posted').click( function() {
            port.postMessage({ 'message': 'OpenTab',
                               'url'  : 'http://forums.somethingawful.com/misc.php?action=whoposted&threadid='+findThreadID() });
        });
    });
}

/**
 * Open all of your tracked and updated threads in a new tab
 *
 */
function renderOpenUpdatedThreadsButton() {
    jQuery('th.title:first').each( function() {
        var headerHTML = jQuery(this).html();
        var updatedHTML = headerHTML + '<div id="open-updated-threads"' +
                                       '     style="float:right; ' +
                                       '            cursor:pointer; ' +
                                       '            text-decoration: underline;">' +
                                       'Open updated threads</div>';

        jQuery(this).html(updatedHTML);

        // Open all updated threads in tabs
        jQuery('#open-updated-threads').click( function() {
            jQuery('tr.thread').each( function() {
                var img_split = jQuery('td.star > img', this).attr('src').split('/');
                var img_name = img_split[img_split.length-1];
                if (settings.ignore_bookmark_star != img_name) {
                    if (jQuery('a[class*=count]', this).length > 0) {
                        var href = jQuery('a[class*=count]', this).attr('href');
                        port.postMessage({ 'message': 'OpenTab',
                                           'url'  : 'http://forums.somethingawful.com'+href });
                    }
                }
            });
        });
    });
}

/**
 * Extract friends list from the User CP
 */
function updateFriendsList() {
    var friends = new Array();

    jQuery('div#buddylist td:nth-child(2)>a').each( function() {
        friends.push(this.title);
    });

    port.postMessage({ 'message': 'ChangeSetting',
                       'option' : 'friendsList',
                       'value'  : JSON.stringify(friends) });
}

/**
 * Highlight the posts of friends
 */
function highlightFriendPosts() {
    var friends = JSON.parse(settings.friendsList);
    var selector = '';

    if (friends == 0) {
        return;
    }

    jQuery(friends).each(function() {
        if (selector != '') {
            selector += ', ';
        }
        selector += "dt.author:contains('" +  this + "')";
    });

    jQuery('table.post:has('+selector+') td').each(function () {
        jQuery(this).css({
            'border-collapse' : 'collapse',
            'background-color' : settings.highlightFriendsColor
        });
    });
}

/**
 * Highlight the posts by the OP
 */
function highlightOPPosts() {
    jQuery('table.post:has(dt.author.op) td').each(function () {
        jQuery(this).css({
            'border-collapse' : 'collapse',
            'background-color' : settings.highlightOPColor
        });
    });
}

/**
 * Highlight the posts by one self
 */
function highlightOwnPosts() {
    jQuery("table.post:has(dt.author:contains('"+settings.username+"')) td").each(function () {
        jQuery(this).css({
            'border-collapse' : 'collapse',
            'background-color' : settings.highlightSelfColor
        });
    });
}

/**
 * Highlight the posts by moderators and admins
 */
function highlightModAdminPosts() {
    if (settings.modList != null) {
        var modList = JSON.parse(settings.modList);

        // Highlight mods and admin thread OPs on forumdisplay.php
        jQuery('td.author > a').each(function() {
            var userid = jQuery(this).attr('href').split('userid=')[1];
            if (modList[userid] != null) {
                var color;
                switch (modList[userid].mod) {
                    case 'M':
                        color = settings.highlightModeratorColor;
                        break;
                    case 'A':
                        color = settings.highlightAdminColor;
                        break;
                }
                jQuery(this).css('color', color);
                jQuery(this).css('font-weight', 'bold');
            }
        });

        // Highlight mod and admin last posters on forumdisplay.php
        jQuery('td.lastpost > a.author').each(function() {
            var username = jQuery(this).html();
            // No userid in this column so we have to loop
            for(userid in modList) {
                if (username == modList[userid].username) {
                    var color;
                    switch (modList[userid].mod) {
                        case 'M':
                            color = settings.highlightModeratorColor;
                            break;
                        case 'A':
                            color = settings.highlightAdminColor;
                            break;
                    }
                    jQuery(this).css('color', color);
                    jQuery(this).css('font-weight', 'bold');
                    break;
                }
            }
        });
    }

    if (settings.highlightModAdminUsername != "true") {
        jQuery('table.post:has(dt.author:has(img[title="Moderator"])) td').each(function () {
            jQuery(this).css({
                'border-collapse' : 'collapse',
                'background-color' : settings.highlightModeratorColor
            });
        });
        jQuery('table.post:has(dt.author:has(img[title="Admin"])) td').each(function () {
            jQuery(this).css({
                'border-collapse' : 'collapse',
                'background-color' : settings.highlightAdminColor
            });
        });
    } else {
        jQuery('dt.author > img[title="Moderator"]').each(function() {
            jQuery(this).parent().css('color', settings.highlightModeratorColor);
        });

        jQuery('dt.author > img[title="Admin"]').each(function() {
            jQuery(this).parent().css('color', settings.highlightAdminColor);
        });
    }
}

/**
 * Update the list of forums.
 */
function updateForumsList() {
    var forums = new Array();

    var stickyList = new Array();
    if (settings.forumsList != null) {
        var oldForums = JSON.parse(settings.forumsList);
        for(i in oldForums) {
            stickyList[oldForums[i].id] = oldForums[i].sticky;
        }
    }

    jQuery('select[name="forumid"]>option').each(function() {
        if (this.text == "Please select one:")
            return;

        var sticky = false;
        if (stickyList[this.value] == true)
            sticky = true;

        forums.push({ 'name' : this.text,
                       'id'  : this.value,
                       'sticky'  : sticky });
    });

    if (forums.length > 0) {
        port.postMessage({ 'message': 'ChangeSetting',
                           'option' : 'forumsList',
                           'value'  : JSON.stringify(forums) });
    }
}

/**
 * Fetches the username of the current user from the user CP
 */
function updateUsernameFromCP() {
    var titleText = jQuery('title').text();
    var username = titleText.match(/- User Control Panel For (.+)/)[1];
    if (settings.username != username) {
        port.postMessage({ 'message' : 'ChangeSetting',
                           'option'  : 'username',
                           'value'   : username });
    }
}

/**
 * Displays notes under usernames.
 */
function displayUserNotes() {
    var notes;
    if (settings.userNotes == null) {
        notes = { "50339" : {'text' : 'SALR Developer', 'color' : '#9933FF'},   // Sebbe
                  "3882420" : {'text' : 'SALR Developer', 'color' : '#9933FF'}, // Onoj
                  "156041" : {'text' : 'SALR Developer', 'color' : '#9933FF'},  // wmbest2
                  "115838" : {'text' : 'SALR Developer', 'color' : '#9933FF'}}; // Ferg
        port.postMessage({ 'message': 'ChangeSetting',
                           'option' : 'userNotes',
                           'value'  : JSON.stringify(notes) });
    } else {
        notes = JSON.parse(settings.userNotes);
    }

    jQuery('body').append("<div id='salr-usernotes-config' title='Set note' style='display: none'>"+
        "<fieldset>"+
            "<p><label for='salr-usernotes-text'><strong>Note:</strong></label><br/><input type='text' id='salr-usernotes-text'/></p>"+
            "<p><label for='salr-usernotes-color'><strong>Color:</strong></label><br/><input type='text' id='salr-usernotes-color'/></p>"+
        "</fieldset>"+
    "</div>");
    
    jQuery('table.post').each(function () {
        var userid = jQuery(this).find('ul.profilelinks a')[0].href.match(/\d+$/)[0];
        var hasNote = notes[userid] != null;
        
        if (hasNote) {
            jQuery('dl.userinfo > dt.author', this).after(
                '<dd style="font-weight: bold; color: ' + notes[userid].color + '">' + notes[userid].text + '</dd>'
            );
        }

        var editLink = jQuery('<li><a href="javascript:;">Edit Note</a></li>');
        jQuery('a', editLink).click(function() {
            jQuery('#salr-usernotes-config').dialog({
                open: function(event, ui) {
                    jQuery('#salr-usernotes-text').val(hasNote ? notes[userid].text : '');
                    jQuery('#salr-usernotes-color').val(hasNote ? notes[userid].color : '#FF0000');
                },
                buttons: {
                    "OK" : function () {
                        notes[userid] = {'text' : jQuery('#salr-usernotes-text').val(), 
                                         'color' : jQuery('#salr-usernotes-color').val()};
                        port.postMessage({ 'message': 'ChangeSetting',
                                           'option' : 'userNotes',
                                           'value'  : JSON.stringify(notes) });
                        jQuery(this).dialog('destroy');
                    },
                    "Delete" : function () {
                        delete notes[userid];
                        port.postMessage({ 'message': 'ChangeSetting',
                                           'option' : 'userNotes',
                                           'value'  : JSON.stringify(notes) });
                        jQuery(this).dialog('destroy');                    
                    },
                    "Cancel" : function () { jQuery(this).dialog('destroy'); } }
            });
        });
        // append a space to create a new text node which fixes spacing problems you'll get otherwise
        jQuery('ul.profilelinks', this).append(editLink).append(' '); 
    });
}

/**
 * Add boxes around blockquotes
 */
function boxQuotes() {
    // CSS taken from http://forums.somethingawful.com/showthread.php?threadid=3208437&userid=0&perpage=40&pagenumber=3#post371892272
    jQuery('.bbc-block').css({
        'background-color': 'white',
        'border': '1px solid black',
        'padding': '0px'
    });

    jQuery('.bbc-block h4').css({
        'border': 'none',
        'border-bottom': '1px solid black',
        'font-style': 'normal',
        'padding': '3px'
    });

    jQuery('.bbc-block blockquote').css({
        'padding': '7px 7px 7px 7px'
    });
}

/**
 * Highlight the user's username in posts
 */
function highlightOwnUsername() {
    jQuery('td.postbody').each(function() {
        jQuery(this).html(jQuery(this).html().replace(settings.username, '<span class="usernameHighlight" style="font-weight: bold; color: ' + settings.usernameHighlight + ';">' + settings.username + '</span>'));
    });
}

/**
 * Highlight the quotes of the user themselves.
 */
function highlightOwnQuotes() {
    jQuery('.bbc-block h4:contains(' + settings.username + ')').each(function() {
        jQuery(this).parent().css("background-color", settings.userQuote);

        // Replace the styling from username highlighting
        var that = jQuery(this);
        jQuery('.usernameHighlight', that).each(function() {
            jQuery(this).css('color', '#555');
        });
    });
}

/**
 * Returns the current thread ID
 *
 */
function findThreadID() {
    // Substrings out everything after the domain, then splits on the ?,
    // defaults to the argument list (right), splits on the &, looks at the first
    // parameter in the list, and splits on the = to get the result
    var parameterList = ((window.location.href).substr(33).split('?')[1]).split('&');

    for (var parameter in parameterList) {
        var currentParam = (parameterList[parameter]).split('=');

        if (currentParam[0] == 'threadid') {
            return currentParam[1]; 
        }
    }
}

/**
 * Binds quick-reply box to reply/quote buttons
 *
 */
function bindQuickReply() {
    jQuery('a > img[alt="Quote"]').each(function() {
        jQuery(this).parent().attr('href', 'javascript:;');

        var parentTable = jQuery(this).parent().parent().parent().parent().parent().parent().parent();

        // Query for the username
        var username = jQuery('tr > td.userinfo > dl > dt.author', parentTable).html();
        // Query for the quote
        var quote = jQuery('tr > td.postbody', parentTable).clone();

        // Bind the quick reply box to the button
        jQuery(this).parent().click(function() {
            quickReply.appendQuote(username, quote);
            quickReply.show();

            /***********TODO: FIX THIS*********
            if (!quickReply.isExpanded()) {
                quickReply.toggleView();
            } else {
                quickReply.show();
            }
            **********************************/
        });
    });
    
    jQuery('a > img[alt="Reply"]').each(function() {
        jQuery(this).parent().attr('href', 'javascript:void();');

        jQuery(this).parent().click(function() {
            quickReply.show();
        });
    });
}

function findFormKey() {
    jQuery('input[name="formkey"]').each(function() {
        port.postMessage({ 'message': 'ChangeSetting',
                           'option' : 'forumPostKey',
                           'value'  : jQuery(this).attr('value') });
    });
}

/**
 *  Displays a warning if the last poster in the thread was the current user, or
 *  the post contains a quote of the current user.
 **/
function quoteNotEditProtection() {
    if(settings.username){
        if(jQuery("textarea[name='message']:contains('quote=\"" + settings.username + "\"')").length > 0 ||
            jQuery('table.post:first tr > td.userinfo > dl > dt.author:contains("' + settings.username + '")').length > 0)
        {
            jQuery("#main_full").after("<div class='qne_warn'><h4>Warning! Possible Quote/Edit mixup.</h4></div>");
        }
    }
    
}

/**
 *
 *  Thread notes
 *
 *  Displys a widget for editing thread-specific notes.
 *
 *  @author Scott Lyons (Captain Capacitor)
 **/
function threadNotes() {
    //  Only valid on thread pages
    if(findCurrentPage() == 'forumdisplay.php')
        return;
        
    if(jQuery("#container").data('showThreadNotes'))
    	return true;
    jQuery('#container').data('showThreadNotes', true);
    
    var notes;
    if(settings.threadNotes == null)
    {
       	notes = new Object();
       	port.postMessage({
			'message': 'ChangeSetting',
			'option': 'threadNotes',
			'value': JSON.stringify(notes)
		});
    }
    else {
    	notes = JSON.parse(settings.threadNotes);
    }
    var basePageID = findForumID();
    var hasNote = notes[String(basePageID)] != null;
    
    var notesHTML = '<nav id="threadnotes"> ' +
                    '   <div id="threadnotes-body">' +
                    '       <span><a id="threadnotes-show" style="color: #fff; text-shadow: #222 0px 1px 0px;">Show thread notes</a></span>' +
                    '   </div>' +
                    '</nav>';
    jQuery("#container").append(notesHTML);
    jQuery("#threadnotes").addClass('displayed');
    jQuery("#threadnotes-show").css({
        'background': 'url("' + chrome.extension.getURL('images/') + 'note.png") no-repeat left center'
    });
    
    jQuery('body').append("<div id='salr-threadnotes-config' title='Thread notes' style='display:none'>"+
    	"<textarea id='salr-threadnotes-text' rows='5' cols='20' style='width: 274px;'></textarea>"+
    "</div>");
    
    jQuery("#threadnotes-show").click(function(){
    	jQuery('#salr-threadnotes-config').dialog({
    		open: function(event, ui){
    		    jQuery(document).trigger('disableSALRHotkeys');
    			jQuery('#salr-threadnotes-text').val(hasNote ? notes[basePageID] : '');
    		},
    		buttons: {
    			"Save" : function() {
    				notes[String(basePageID)] = jQuery('#salr-threadnotes-text').val();
    				port.postMessage({ 'message': 'ChangeSetting',
                                       'option' : 'threadNotes',
                                       'value'  : JSON.stringify(notes) });
    				
    				jQuery(this).dialog('destroy');
                    jQuery(document).trigger('enableSALRHotkeys');
    				hasNote = true;
 				},
    			"Delete": function() { 
    				delete notes[String(basePageID)];
    				port.postMessage({ 'message': 'ChangeSetting',
                                       'option' : 'threadNotes',
                                       'value'  : JSON.stringify(notes) });
    				hasNote = false;
                    jQuery(document).trigger('enableSALRHotkeys');
    				jQuery(this).dialog('destroy');
    			},
    			"Cancel" : function() { 
    			    jQuery(this).dialog('destroy');
    			    jQuery(document).trigger('enableSALRHotkeys');
    			}
    		}
    	});
    });
}
