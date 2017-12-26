'strict mode'

const remote = require('electron').remote;

var webStorageEnabled = true;

function el(selector) {
    return document.getElementById(selector);
}

function select(selector) {
    return document.querySelector(selector);
}

function selectAll(selector) {
    return document.querySelectorAll(selector);
}

function getConnection() {

    var mysql = require('mysql');

    // Add the credentials to access your database
    var connection = mysql.createConnection({
        host     : localStorage.getItem('setting_app_mysql_host'),
        user     : localStorage.getItem('setting_app_mysql_user'),
        password : localStorage.getItem('setting_app_mysql_password'),
        database : localStorage.getItem('setting_app_mysql_database')
    });

    // connect to mysql
    connection.connect(function(err) {

        if(err){
            console.log(err);
        }
    });

    return connection;
}

function checkConnection() {

    var connection = getConnection();

    // Close the connection
    connection.end(function(){

    });
}

function executeQuery(query, callback) {

    var connection = getConnection();

    if(connection) {

        connection.query(query, function(err, rows, fields) {

            if(err){
                console.log("An error ocurred performing the query.");
                console.log(err);
                return;
            }

            callback(rows);
        });

        // Close the connection
        connection.end(function(){
            // The connection has been closed
        });
    }
}

function insertTransaction(description, value, date, callback){

    var query = 'INSERT INTO transaction (description, value, currency, date, status) VALUES (\''+description+'\', '+value+', \'USD\', \''+date+'\', 1)';

    executeQuery(query, function(result) {
        callback(result);
    });
}

function formatDate(date) {

    var new_date = new Date(date),
        day      = new_date.getDate(),
        month    = new_date.getMonth() + 1,
        year     = new_date.getFullYear();

    return [day, month, year].join('/');
}

function getTransactions(callback){

    var query = 'SELECT * FROM `transaction`';

    executeQuery(query, function(result) {
        callback(result);
    });
}

function deleteTransactions(id){

    var query = 'DELETE FROM `transaction` WHERE id='+id;

    executeQuery(query, function() {
    });
}

function addTransationRow(id, description, date, value) {

    var html = '';

    html += '<tr id="transaction_row_'+id+'">';
    html += '<td class="col-id">';
    html += id;
    html += '</td>';
    html += '<td class="col-description">';
    html += description;
    html += '</td>';
    html += '<td class="col-date align-center">';
    html += formatDate(date);
    html += '</td>';
    html += '<td class="col-value align-center">';
    html += value;
    html += '</td>';
    html += '<td class="col-options">';
    //html += '<div id="app_delete_transaction_'+id+'" data-delete-transaction="'+id+'" class="btn btn-mini btn-red delete">Delete</div>';
    html += '<span id="app_delete_transaction_'+id+'" data-delete-transaction="'+id+'" class="icon icon-mini icon-close delete"></span>';
    html += '</td>';
    html += '</tr>';

    var table = document.querySelector('#table > tbody');

    table.innerHTML = table.innerHTML + html;
}

function loadTransations(databaseEnabled) {

    if(!webStorageEnabled) {

        // Get the mysql service
        getTransactions(function(rows){

            rows.forEach(function(row){
                addTransationRow(row.id, row.description, row.date, row.value);
            });

            enableDeleteAction();
        });

    } else {

        // Use Web Storage 
        getLocalTransactions(function(rows) {

            rows.forEach(function(row){

                addTransationRow(row.val.id, row.val.description, row.val.date, row.val.value);
            });

            enableDeleteAction();
        });
    }
}

function initTitleBar() { 

    document.getElementById("min_btn").addEventListener("click", function (e) {

        var window = remote.getCurrentWindow();
        window.minimize(); 
    });

    document.getElementById("max_btn").addEventListener("click", function (e) {
        
        var window = remote.getCurrentWindow();

        if (!window.isMaximized()) {
            window.maximize();
        } else {
            window.unmaximize();
        }  
    });

    document.getElementById("close_btn").addEventListener("click", function (e) {

        var window = remote.getCurrentWindow();
        window.close();
    }); 
}; 

function startApp() {

    document.onreadystatechange = function () {
        if (document.readyState == "complete") {

            checkConnection();

            loadSettings();

            initTitleBar();

            loadTransations();
        }
    };
}

startApp();

el('insert').addEventListener('click', function() {

    var description = el('app_insert_description').value,
        date        = el('app_insert_date').value,
        value       = el('app_insert_value').value;

    if(webStorageEnabled) {

        insertLocalTransaction(description, value, date, function (result) {
            addTransationRow(result.id, description, date, value)
        })

    } else {

        insertTransaction(description, value, date, function (result) {
            addTransationRow(result.insertId, description, date, value)
        });
    }

},false);

select('#btn_insert').addEventListener('click', function() {
    this.querySelector('.float-btn-icon').classList.toggle('float-btn-close');
    document.querySelector('#transaction_insert_form').classList.toggle('active');
});

function enableDeleteAction() {

    var deleteLink = selectAll('.delete');

    for (let i = 0; i < deleteLink.length; i++) {

        deleteLink[i].addEventListener('click', function(event) {

            if (confirm("sure do you want to delete " + this.id)) {

                let transaction_id = this.getAttribute("data-delete-transaction"),
                    element        = el('transaction_row_'+transaction_id);

                element.parentNode.removeChild(element);

                if(webStorageEnabled) {
                    deleteLocalTransactions(transaction_id);
                } else {
                    deleteTransactions(transaction_id);
                }

                event.preventDefault();
            }
        });
    }
}

function getStorageid() {

    var id = localStorage.getItem('item_id');

    if(!id) {

        localStorage.setItem('item_id', 1);
        return 1;

    } else {

        id++;
        localStorage.setItem('item_id', id);
    }

    return id;
}

function insertLocalTransaction(description, value, date, callback){

    var id = getStorageid();

    var transaction = {
        'id': id,
        'description': description, 
        'value': value,
        'currency': 'USD',
        'date': date,
        'status': 1,
    }

    localStorage.setItem('transaction_'+id, JSON.stringify(transaction));

    callback(getLocalTransactionById(id));
}

function getLocalTransactionById(id){

    var transaction = JSON.parse(localStorage.getItem('transaction_'+id));

    transaction.id = id;

    return transaction;
}

function queryLocalStorage(query){

    var isJSON = require('is-json');

    var i, results = [];

    for (i in localStorage) {

        if (localStorage.hasOwnProperty(i)) {
            if (i.match(query) || (!query && typeof i === 'string')) {

                value = localStorage.getItem(i);

                if(isJSON(value)) {
                    value = JSON.parse(value);
                }

                results.push({key:i,val:value});
            }
        }
    }

    return results;
}

function getLocalTransactions(callback) {
    callback(queryLocalStorage('transaction_*'));
}

function deleteLocalTransactions(id){

    return localStorage.removeItem('transaction_'+id);
}

select('#btn_settings').addEventListener('click', function() {

    var table = document.querySelector('#table');

    table.classList.toggle('disabled');

    document.querySelector('#app_settings').classList.toggle('active');
});

select('#app_save_settings_btn').addEventListener('click', function () {
    saveSettings();
});

function saveSettings() {

    var inputs = document.querySelectorAll('#app_settings input:not(.btn-submit)');

    for(var i = 0; i < inputs.length; i++) {

        let setting_id = inputs[i].id;

        if(inputs[i].value != '') {
            localStorage.setItem('setting_'+setting_id, inputs[i].value);
        }
    }
}

function getSettings() {
    return queryLocalStorage('setting_*');
}

function loadSettings() {

    var settings = getSettings();

    for(var i = 0; i < settings.length; i++) {

        let selector = settings[i].key.replace('setting_', '');

        document.querySelector('#app_settings #'+selector).value = settings[i].val;
    }
}





