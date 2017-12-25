'strict mode'

const remote = require('electron').remote; 

function el(selector) {
    return document.getElementById(selector);
}

function select(selector) {
    return document.querySelector(selector);
}

function selectAll(selector) {
    return document.querySelectorAll(selector);
}

function executeQuery(query, callback) {

    var mysql = require('mysql');

    // Add the credentials to access your database
    var connection = mysql.createConnection({
        host     : 'localhost',
        user     : 'root',
        password : 'root',
        database : 'mony_app'
    });

    // connect to mysql
    connection.connect(function(err) {

        // in case of error
        if(err){
            console.log(err);
        }
    });

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
        callback(null);
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

function loadTransations() {

    // Get the mysql service
    getTransactions(function(rows){

        rows.forEach(function(row){
            addTransationRow(row.id, row.description, row.date, row.value);
        });

        enableDeleteAction();
    });
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

    // Get the mysql service
    insertTransaction(description, value, date, function (result) {
        addTransationRow(result.insertId, description, date, value)
    });

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

                deleteTransactions(transaction_id);

                event.preventDefault();
            }
        });
    }
}
