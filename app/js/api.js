var first = true, historyScroll;

Handlebars.registerHelper('ifCond', function (v1, operator, v2, options) {

    switch (operator) {
        case '==':
            return (v1 == v2) ? options.fn(this) : options.inverse(this);
        case '===':
            return (v1 === v2) ? options.fn(this) : options.inverse(this);
        case '<':
            return (v1 < v2) ? options.fn(this) : options.inverse(this);
        case '<=':
            return (v1 <= v2) ? options.fn(this) : options.inverse(this);
        case '>':
            return (v1 > v2) ? options.fn(this) : options.inverse(this);
        case '>=':
            return (v1 >= v2) ? options.fn(this) : options.inverse(this);
        case '&&':
            return (v1 && v2) ? options.fn(this) : options.inverse(this);
        case '||':
            return (v1 || v2) ? options.fn(this) : options.inverse(this);
        default:
            return options.inverse(this);
    }
});
Handlebars.registerHelper('a_account', function (block) {
    return info.account_data.Account; //just return global variable value
});
Handlebars.registerHelper('toFixed', function (v, prec) {
    return toFixed(parseFloat(v) / 1000000, parseInt(prec));
});

Handlebars.registerHelper('toFixedCurrencies', function (v, prec) {
    return toFixed(parseFloat(v), parseInt(prec));
});

Handlebars.registerHelper('shorter', function (v, i) {
    if (findContact(v) != null)
        return findContact(v);
    return v.substring(0, i) + "...";
});
Handlebars.registerHelper('toPercent', function (a, b, c) {
    if (a > 0)
        if (b != 0)
            return toFixed((a / b) * 100, 1).toString() + "%";
        else
            return "0%";
    if (c != 0)
        return toFixed(-(a / c) * 100, 1).toString() + "%";
    else
        return "0%";
});

var block = false;
var api = {
    "BLOB": "https://id.ripple.com"
}

function findContact(adr) {
    var ret = null;
    contacts.contacts.forEach(function (val, ind) {
        console.log(contacts.contacts[ind].address);
        if (contacts.contacts[ind].address == adr)
            ret = contacts.contacts[ind].name;
    });
    return ret;
}

function toFixed(num, fixed) {
    fixed = fixed || 0;
    fixed = Math.pow(10, fixed);
    return Math.floor(num * fixed) / fixed;
}

function createCORSRequest(method, url) {
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr) {
        xhr.open(method, url, false);
    } else if (typeof XDomainRequest != "undefined") {
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        xhr = null;
    }
    return xhr;
}

function template(id, data) {
    var source = $$("#" + id).html();
    var template = Handlebars.compile(source);
    return template(data);
}

function NFClisten(nfcEvent) {
    var tag = nfcEvent.tag,
	ndefMessage = tag.ndefMessage;
    alert(JSON.stringify(ndefMessage));

    //alert(nfc.bytesToString(ndefMessage[0].payload).substring(3));
}

function setUser(acc) {
    contacts = acc.blob.data; //contacts.contacts

    if (username + "_contacts" in storage) {
        contactsFromStorage = JSON.parse(storage[username + "_contacts"]);

        contactsFromStorage.forEach(function (val, ind) {

            contacts.contacts.forEach(function (val2, ind2) {
                if (val2.address == JSON.parse(storage[username + "_" + val]).address) {
                    delete contacts.contacts[ind2];
                }

            });
            contacts.contacts.push(JSON.parse(storage[username + "_" + val]));
        });

        var temp = [];

        contacts.contacts.forEach(function (val, ind) {
            console.log("ind: " + ind);
            if (contacts.contacts[ind] != undefined)
                temp.push(contacts.contacts[ind]);
        });

        contacts.contacts = temp;
    }
    remote.set_secret(acc.blob.data.account_id, acc.secret);
    //try {
    //		var message = [
    // 	 ndef.textRecord("hello, world")
    //	];

    //	nfc.share(message);	
    //	}
    //	catch(e){}
    remote.on('transaction_all', transactionListener);
}

function transactionListener(data) {
    if (data.transaction.TransactionType == "Payment" && data.transaction.Destination == info.account_data.Account && !block) {
        block = true;
        setTimeout(function () {
            block = false;
        }, 200);
        refreshInfo();
        console.log('TRANSACTION!!!');
        console.log(data.transaction);
        var amount = !isNaN(data.transaction.Amount) ? toFixed(data.transaction.Amount / 1000000, 1) : data.transaction.Amount.value;
        var currency = !isNaN(data.transaction.Amount) ? 'XRP' : data.transaction.Amount.currency;
        myApp.addNotification({
            title: 'New payment',
            message: 'You have just received ' + amount + " " + currency + ' from ' + data.transaction.Account
        });

    }

}

function sendFund(from, to, amount, currency) {
    var transaction = remote.transaction();
    var amount = (currency == 'XRP') ? ripple.Amount.from_human(amount + 'XRP') : amount + "/" + currency + "/" + from;

    transaction.payment({
        from: from,
        to: to,
        amount: amount
    });
    console.log(amount);
    transaction.submit(function (err, payment) {
        if (err != null) {
            myApp.alert(err, 'Error');
        }
        else {
            mainView.goBack("main.html", true);
            setTimeout(function () {
                refreshInfo();
            }, 2000);
        }
    });
}

function showPaymentForm(adr) {
    address = undefined;
    if (adr != null && adr != undefined)
        address = adr;
    mainView.loadPage("payment.html", true);

}
var z;
function getCurrencies() {
    remote.requestAccountLines({ account: info.account_data.Account }, function (e, i) {
        currencies = uniqueCurrencies(i);
        z = i;
        console.log("Account lines:");
        console.log(i);
        console.log("Currencies lines:");
        console.log(i);
        var compiled = template("currencies-template", currencies);
        var trust = template("trust-lines", i);
        $$(".currency-added").remove();
        $$('.trust-added').remove();
        $$("#list-of-trust-lines ul").append(trust);
        $$(".currency ul").append(compiled);

        setTimeout(function () {
            currencies.lines.forEach(function (val, ind) {
                console.log('#' + val.currency + "inUsd: " + val.inUSD);
                $$('#' + val.currency + "-inUsd").html(toFixed(val.inUSD, 2));
            });
        }, 1000);
    })};
}

function uniqueCurrencies(data) {
    var ret = {};
    var lines = {
        lines: []
    };
    data.lines.forEach(function (val, ind) {
        if (!(val.currency in ret))
            ret[val.currency] = parseFloat(val.balance);
        else
            ret[val.currency] += parseFloat(val.balance);
    });

    for (var k in ret) {
        if (ret.hasOwnProperty(k)) {
            lines.lines.push({ currency: k, balance: ret[k], inUSD: 0.00 });
        }
    }

    lines.lines.forEach(function (val, ind) {
        $.ajax({
            type: 'GET',
            url: 'http://rate-exchange.appspot.com/currency?from=' + val.currency + '&to=USD&q=1',
            dataType: 'jsonp',
            success: function (json, text) {
                if (!('err' in json)) {
                    lines.lines[ind].inUSD = lines.lines[ind].balance * json.rate;
                }
            },
            async: false
        });
    });

    console.log("Lines after ajax: ");
    console.log(lines);
    return lines;
}

function setTrustLine(adr, curreny, value) {
    var transaction = remote.transaction();

    transaction.rippleLineSet({
        from: info.account_data.Account,
        limit: '' + value + "/" + currency + "/" + adr
    });
    transaction.submit(function () {
        setTimeout(function () {
            refreshInfo();
        }, 1000);
    });
}

function refreshInfo() {
    remote.requestAccountInfo({ account: result.blob.data.account_id }, function(e, i) {
        if (i != undefined)
            info = i;
        else {
            info = {};
            info.account_data = {};
            info.account_data.Account = result.blob.data.account_id;
        }
        balance = info.account_data.Balance ? (info.account_data.Balance) / 1000000 : 0;
        $$("#xrp-amount").text(toFixed(balance, 1));
        $$('#xrp-usd').html("USD<span>" + toFixed(balance * 0.006, 1) + "</span>");
    });

    remote.request_account_tx({ account: info.account_data.Account, ledger_index_min: -1 }, function(e, i) {
        i.transactions.forEach(function(val, ind) {
            i.transactions[ind].acc = info.account_data.Account;
        });
        console.log(i);
        var transa = template('history', i);
        $$("#history-entries div").html('').append(transa);
        setTimeout(function() {
            //historyScroll = new IScroll('#history-entries', {
            //	eventPassthrough: true
            //});
        }, 400);
        setTimeout(function() {
            //historyScroll.refresh()
        }, 600);
    });
    getCurrencies();
    setTimeout(function() {
        refreshEvents(eventList);
    }, 2000);
}

function addContact(name, adr) {

}

function getContacts() {
    var conta = template("contacts", contacts);
    $$("#contacts-area").html('').append(conta);
}

function auth(user, pass) {
    var vault = new ripple.VaultClient();
    vault.loginAndUnlock(user, pass, null, function (err, res) {
        if (err) {
            completeLogin(undefined);
        } else {
            setUser(res);
            console.log(res);
            completeLogin(res);
        }
    });
};

function completeLogin(res) {
    result = res;
    if (result !== undefined) {
        var userAddress = result.blob.data.account_id;
        remote.request_account_info({ account: userAddress }, function (e, i) {
            info = {};
            info.account_data = {};
            info.account_data.Account = userAddress;
            loginThat.removeClass('disabled');
            myApp.hidePreloader();
            mainView.loadPage("main.html", true);
        });
    }
    else {
        loginThat.removeClass('disabled');
        myApp.hidePreloader();
        myApp.alert("Wrong wallet name or password", "Error");
    }
}


var listener = function (nfcEvent) {
    var tag = nfcEvent.tag,
	ndefMessage = tag.ndefMessage;
    showPaymentForm(nfc.bytesToString(ndefMessage[0].payload).substring(3));

    cancelListen();
    myApp.closeModal();
};


function listen() {
    showWait();
    try {
        nfc.unshare(function () { }, function () { });
    } catch (exc) { }

    //nfc.addNdefListener (listener, function () { /*alert("Waiting for NDEF tag");*/ }, function (error) { alert("Error adding NDEF listener " + JSON.stringify(error)); cancelListen(); });
    if (first) {
        nfc.addMimeTypeListener("text/json", listener, function () {/*alert('listening')*/ }, function () { alert('Unable to start listener'); cancelListen(); });
        first = false;
    }
    else
        nfc.addNdefListener(listener, function () {/*alert('listening')*/ }, function () { alert('Unable to start listener'); cancelListen(); })

}

function cancelListen() {
    nfc.removeNdefListener(listener, function () { /*alert("Tag Listener Removed");*/ }, function (error) { });
}

function send() {
    showWait();
    try {
        nfc.removeNdefListener(listener, function () { }, function (error) { });
    } catch (exc) { }

    var message = [ndef.textRecord(info.account_data.Account)];
    nfc.share(message, function () {
        myApp.closeModal(); cancelSend();
        setTimeout(function () {
            hideWait();
        }, 1000);

    }, function () {
        alert('sending failed'); cancelSend();
        setTimeout(function () {
            hideWait();
        }, 1000);
    });
}

function cancelSend() {
    nfc.unshare(function () { /*alert('Sending stopped')*/ }, function () { });
}
function cancelAll() {
    myApp.closeModal();
    cancelListen();
    cancelSend();
    setTimeout(function () {
        hideWait();
    }, 1000);
}

function showWait() {
    $$('.send-option').hide();
    $$('.wait').show();
}
function hideWait() {
    $$('.send-option').show();
    $$('.wait').hide();
}

function logout() {
    myApp.showIndicator();
    remote.disconnect();
    console.log("disconnected");
    setTimeout(function () {
        remote.connect(function () {
            console.log('connected');
            myApp.hideIndicator();
            mainView.loadPage('index.html');
            location.reload();
        });
    }, 1000);
}

function grantTrust(adr) {
    mainView.loadPage('trustline.html');
}