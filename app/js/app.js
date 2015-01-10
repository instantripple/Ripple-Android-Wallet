// Initialize your app
console.error = function (e) {
    alert(e);
}
var myApp = new Framework7();

// Export selectors engine
var $$ = Framework7.$;

var Remote = ripple.Remote;
var remote, contacts, info, address, balance, history, result, move = false, currencies, action, id, trustlines,
context, loginThat,
trust_adr = undefined,
trust_currency,
trust_amount, newRegister = false
username = null;


var storage = window.localStorage;



// Add view
var mainView = myApp.addView('.view-main', {
    // Because we use fixed-through navbar we can enable dynamic navbar
    dynamicNavbar: true
});
function indexInit() {
    $$('.back-register').click(function () {
        hideTopBar();
    });
    $$('#login-form').on("submit", function (e) {
        e.preventDefault();
        $$('#login-button').click();
    });

    $$("#login-button").on('click', function () {
        loginThat = $$(this);
        myApp.showPreloader("Signing in");
        if (!loginThat.hasClass('disabled')) {
            loginThat.addClass('disabled');
            auth($$("#user-input").val(), $$("#pass-input").val());
        }

    });
}



function contactclick() {
    var $$that = $$(this);
    var buttons = [
	{
	    text: 'Update info',
	    bold: true,
	    onClick: function (e) {
	        action = "edit";
	        id = $$that.data('id');
	        clearContactForm();
	        myApp.popup('.popup-create');
	        myApp.formFromJSON("#contact-form", {
	            "contact-name": $$that.data('name'),
	            "contact-address": $$that.data('address')
	        })
	    }
	},
	{
	    text: 'Delete',
	    onClick: function (e) {
	        $$that.parent().remove();
	        removeFromStorage($$that.data('name'));
	        myApp.closeModal();
	    }
	},
	{
	    text: 'Send funds',
	    onClick: function (e) {
	        showPaymentForm($$that.data('address'));
	        myApp.closeModal();
	    }
	}
    ];
    if (!move)
        myApp.actions(buttons);
}

function touchMove() {
    move = true;
}
function showTopBar() {
    $$('.navbar').addClass('notstartscreen');
    setTimeout(function () {
        $$('.navbar').removeClass('startscreen').removeClass('notstartscreen');
    }, 800);
}

function hideTopBar() {
    setTimeout(function () {
        $$('.navbar').addClass('startscreen');
    }, 800);
    //alert(666);

}

function clearContactForm() {
    $$("#contact-name").val('');
    $$("#contact-address").val('');
}

function touchEnd() {
    setTimeout(function () {
        move = false;
    }, 400);

}

function removeFromStorage(id) {
    if (username + "_" + id in storage) {
        var list = JSON.parse(storage[username + "_contacts"]);
        var index = list.indexOf(id);
        if (index > -1) {
            list.splice(index, 1);
        }

        storage[username + "_contacts"] = JSON.stringify(list);

    }
}

function listenToNFC() {
    try {
        nfc.addTagDiscoveredListener(NFClisten);
    }
    catch (e) { }
}

function payment() {
    showPaymentForm(null);
}

function barcodeHelper(callback) {
    //cordova.plugins.barcodeScanner.scan(
    //	function (result) {
    //		callback(result.text);
    //	}, 
    //	function (error) {
    //		alert("Scanning failed: " + error);
    //	}
    //	);

    cordova.exec(function (result) {
        //alert(JSON.stringify(result));
        callback(result[0]);
    }, function (error) {
        if (error != "Canceled")
            alert("Scanning failed: " + error);
    }, "ScanditSDK", "scan",
                            ["xcR8mB40EeSZmIJfEVfQ1fBdKoAaab8Kv9gmIrV3eTM",
                             {
                                 "beep": true,
                                 "1DScanning": true,
                                 "2DScanning": true
                             }]);
}

function scanBarcode() {
    barcodeHelper(showPaymentForm);
}

function scanBarcodeInline() {
    context = $$(this).parent().find('input');
    barcodeHelper(inlineFill);
}

function inlineFill(text) {
    context.val(text);
}

function toggleEvents(list, toggle) {
    if (toggle == "on") {
        list.forEach(function (val, i) {
            $$(list[i].selector).on(list[i].e, list[i].func);
        });
    }
    else {
        list.forEach(function (val, i) {
            $$(list[i].selector).off(list[i].e, list[i].func);
        });
    }
}

function refreshEvents(list) {
    toggleEvents(list, "off");
    toggleEvents(list, "on");
}

function reindexArray(array) {
    var result = [];
    for (var key in array)
        result.push(array[key]);
    return result;
};

function manageContact(e) {
    e.preventDefault();
    if (true) {
        if (action !== "add") {
            delete contacts.contacts[id];
            contacts.contacts = reindexArray(contacts.contacts);
            getContacts();
        }

        var contact = {
            name: $$("#contact-name").val(),
            address: $$("#contact-address").val()
        };
        storage[username + "_" + contact.name] = JSON.stringify(contact);
        if (username + "_contacts" in storage) {
            var str = storage[username + "_contacts"];
            var stor = JSON.parse(str);
            stor.push(contact.name);
            storage[username + "_contacts"] = JSON.stringify(stor);
        }
        else
            storage[username + "_contacts"] = JSON.stringify([contact.name]);

        contacts.contacts.push(contact);
    }
    else {
        contacts.contacts[id].name = $$("#contact-name").val();
        contacts.contacts[id].address = $$("#contact-address").val();

        if (username + "_contacts" in storage) {
            var obj = {};
            if (username + "_" + $$("#contact-name").val() in storage)
                var obj = JSON.stringify(storage[username + "_" + $$("#contact-name").val()]);

            obj.name = $$("#contact-name").val();
            obj.address = $$("#contact-address").val();
            storage[username + "_" + $$("#contact-name").val()] = JSON.stringify(obj);



            var str = storage[username + "_contacts"];
            var stor = JSON.parse(str);
            stor.push(obj.name);
            storage[username + "_contacts"] = JSON.stringify(stor);
        }
    }
    getContacts();
    refreshEvents(eventList);
    myApp.closeModal();
}

function addTrustLine() {
    setTrustLine($$('#trust-address'), $$('#trust-currency'), $$('#trust-ammount'));
    contacts.contacts.push({
        name: $$("#trust-name").val(),
        address: $$("#trust-address").val()
    });
    mainView.goBack();
    setTimeout(function () {
        refreshInfo();
    }, 1000);
}

function trustlineClick() {
    mainView.loadPage('trustline.html');
}

function gateEdit() {
    trust_adr = $$(this).data('gate-address');
    trust_currency = $$(this).data('gate-currency');
    trust_amount = $$(this).data('gate-amount');
    trustlineClick();
}

function scrollBy(x, y, $$el, ile) {
    //	historyScroll.scrollBy(x, y);

    var current = parseInt($$el.css('top'));
    var height = $$el[0].getBoundingClientRect().height - $$('.slider-slide')[0].getBoundingClientRect().height + 100;
    console.log('Current: ' + current);
    console.log('height: ' + height);
    console.log('y: ' + y);
    if (y > 0 && current <= 0) {
        if (current + y > 0)
            current = -y;
        $$el.css('top', (current + y) + "px");
    }

    else if (y < 0 && (-current) < height) {
        if (current + height < 0)
            current = current + height;
        $$el.css('top', (current + y) + "px");
    }
    //$$el.css('top', (current+y)+"px");


}

function scrollHistory(e) {
    var $$ele = $$('#history-start');
    if ($$(this).hasClass('icon-up'))
        scrollBy(0, 100, $$ele);
    else
        scrollBy(0, -100, $$ele);
}

function scrollContacts(e) {
    console.log('scroll-contacts');
    var $$ele = $$('#contacts-area');
    if ($$(this).hasClass('icon-up'))
        scrollBy(0, 44, $$ele);
    else
        scrollBy(0, -44, $$ele);
}

function scrollTrustlines(e) {
    console.log('scroll-trustlines');
    var $$ele = $$('#list-of-trust-lines');
    if ($$(this).hasClass('icon-up'))
        scrollBy(0, 44, $$ele);
    else
        scrollBy(0, -44, $$ele);

}

function validateRegister(pass, pass_again, user) {
    var errors = ['Wallet name cannot be blank', 'Password cannot contain your wallet name', 'Password must contains at least 8 characters', 'Password must contains at least one number', 'Passwords must match'];
    var res = 'ok';
    if (user.length == 0)
        res = 0;
    else if (pass.indexOf(user) > -1)
        res = 1;
    else if (pass.length < 8)
        res = 2;
    else if (!pass.match(/\d+/g))
        res = 3;
    else if (pass != pass_again)
        res = 4;

    if (res != 'ok')
        return errors[res];
    return 'ok';
}

function register() {
    var pass = $$('#newuser-password').val(),
	pass_again = $$('#newuser-password-again').val(),
	user = $$('#newuser-name').val();
    var result = validateRegister(pass, pass_again, user);
    if (result != 'ok')
        myApp.alert(result, 'Error');
    else {
        myApp.modal({
            title: '<span style="width:42px; height:42px" class="preloader"></span>',
            text: 'We are creating an account for you. It may take a while.',
            buttons: []
        });
        $.get('http://dev.mightyclan.pl/ripple-reg/?user=' + user + '&pass=' + pass, function (data) {
            var res = JSON.parse(data);
            myApp.closeModal()
            if (res.result = "Success")
                myApp.alert('Thank you for registering. You can now log in', "Success!", function () {
                    newRegister = user;
                    mainView.loadPage('index.html', true);
                });
            else
                myApp.alert('Something went wrong. Try again later', "Error");
        });
    }
}

var config = {
    trusted: true,
    trace: true,
    servers: [{ host: 's-west.ripple.com', port: 443, secure: true }]
};

var eventList =
[
{ selector: '.ac-1', e: 'touchmove', func: touchMove },
{ selector: '.ac-1', e: 'touchend', func: touchEnd },
{ selector: '.ac-1', e: 'click', func: contactclick },
{ selector: '.input-qr', e: 'click', func: scanBarcodeInline },
{ selector: '#camera', e: 'click', func: scanBarcode },
{ selector: '#icon-payment', e: 'click', func: payment },
{ selector: '#contact-button', e: 'click', func: manageContact },
{ selector: '#nfc-send', e: 'click', func: send },
{ selector: '#nfc-listen', e: 'click', func: listen },
{ selector: '#nfc-close', e: 'click', func: cancelAll },
{ selector: '#grant-trust', e: 'click', func: addTrustLine },
{ selector: '#trustline-click', e: 'click', func: trustlineClick },
{ selector: '#logout', e: 'click', func: logout },
{ selector: '.gate-edit', e: 'click', func: gateEdit },
{ selector: '.back-register', e: 'click', func: hideTopBar },
{ selector: '.menu-right i', e: 'click', func: scrollHistory },
{ selector: '.scroll-contacts', e: 'click', func: scrollContacts },
{ selector: '.scroll-trustlines', e: 'click', func: scrollTrustlines },
{ selector: '#add-contact-circle', e: 'click', func: function () { action = "add"; clearContactForm(); } }
];
remote = new Remote(config);
remote.connect(function () {
    console.log("connected");
});

$$('body').click(function (e) {
    if (e.target.tagName != 'INPUT' && e.target.tagName != 'input') {
        document.activeElement.blur();
    }

});

indexInit();
// Event listener to run specific code for specific pages
$$(document).on('pageInit', function (e) {
    var page = e.detail.page;
    // If it is About page
    console.log(page.name);
    if (page.name === 'index') {
        indexInit();
        if (newRegister)
            $$('#user-input').val(newRegister);
    }
    else if (page.name === 'main') {

        myApp.slider('.slider-container', {
            preventClicks: false,
            preventClicksPropagation: false
        });
        toggleEvents(eventList, "off");
        // run createContentPage func after link was clicked
        balance = 0;
        refreshInfo();
        $$("#qr-code").html('');
        $$("#qr-code-text").text(info.account_data.Account);
        new QRCode(document.getElementById("qr-code"), info.account_data.Account);
        if (info.account_data.Balance == undefined) {
            myApp.alert("Your account has not been activated yet. Send some XRPs to <small>" + info.account_data.Account + "</small><center><div style='margin-top: 30px' id='new-qr'></div></center>", "Warning");
            new QRCode(document.getElementById("new-qr"),
               { text: info.account_data.Account, width: 192, height: 192 });
        }

        getContacts();
        remote.request_account_tx({ account: info.account_data.Account, ledger_index_min: -1 }, function (e, i) {
            i.transactions.forEach(function (val, ind) {
                i.transactions[ind].acc = info.account_data.Account;
            });
            console.log(i);
            //var transa = template('history',i);
            //$$("#history-entries").html('').append(transa);
            // var theScroll = new IScroll('#history-entries');
        });
        toggleEvents(eventList, "on");

        $$('.gate-edit').on('click', function () {
            myApp.swipeoutOpen($$(this).parent().parent().parent());
        })
    }
    else if (page.name === 'payment') {
        function doPayment() {
            sendFund(info.account_data.Account, $$("#address-input").val(), $$("#amount-input").val(), $$("#currency-field").val());
        }
        $$("#payment-button").off("click", doPayment);
        if (address !== undefined)
            $$("#address-input").val(address);
        $$("#payment-button").click(doPayment);
    }
    else if (page.name === 'add-trustline') {
        $(".knob").knob();
        if (trust_adr != undefined) {
            $$("#trust-address").val(trust_adr);
            $$("#trust-amount").val(trust_amount);
            $$("#trust-currency").val(trust_currency);
            $$("#trust-currency").parent().find("div").find(".item-after").html(trust_currency);
            trust_adr = undefined;
        }


    }
    else if (page.name === 'register') {
        $$('#register-button').off('click', register);
        $$('#register-button').on('click', register);
    }
    if (page.name !== 'index') {
        showTopBar();
    }


});

// Generate dynamic page
var dynamicPageIndex = 0;

function wypisz(e, i) {
    console.log(i);
}