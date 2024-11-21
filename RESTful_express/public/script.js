let addOrUpdate = "";

window.onload = function () {
  // Event listeners for various buttons and table clicks
  document
    .querySelector(".tableArea")
    .addEventListener("click", handleTableClick);
  document.querySelector(".btnAdd").addEventListener("click", addItem);
  document.querySelector(".btnUpdate").addEventListener("click", updateItem);
  document
    .querySelector(".confirmDelete")
    .addEventListener("click", deleteItem);
  document.querySelector(".btnAccept").addEventListener("click", acceptChanges);
  document.querySelector(".btnCancel").addEventListener("click", cancelChanges);
  document.querySelector(".btnDelete").addEventListener("click", showForDelete);

  updateTable();
  setInputPanel(false); // Disable input panel on load
};

// Function to build the table with data
function buildTable(data) {
  let element = document.querySelector(".tableArea");
  let htmlString =
    "<table><tr><th>ID</th><th>Category</th><th>Description</th><th>Price</th><th>Vegetarian</th></tr>";

  for (let i = 0; i < data.length; i++) {
    htmlString += "<tr><td>" + data[i].id + "</td>";
    htmlString += "<td>" + data[i].category + "</td>";
    htmlString += "<td>" + data[i].description + "</td>";
    htmlString += "<td>" + data[i].price + "</td>";
    htmlString += "<td>" + (data[i].vegetarian ? "Yes" : "No") + "</td></tr>";
  }

  htmlString += "</table>";
  element.innerHTML = htmlString;
}

// Function to show delete confirmation UI
function showForDelete() {
  clearInput();
  setInputPanel(true);
  setIdInput(false);
  populateInput();
  setButtonStates(true);
  disableDelete(false);
}

// Function to disable delete button
function disableDelete(value) {
  if (value) {
    document.querySelector(".confirmDelete").classList.add("hidden");
    document.querySelector(".btnAccept").classList.remove("hidden");
  } else {
    document.querySelector(".confirmDelete").classList.remove("hidden");
    document.querySelector(".btnAccept").classList.add("hidden");
  }
}

// Function to update the table by fetching data from API
function updateTable() {
  let url = "http://localhost:8000/api/menuitems";
  let method = "GET";
  let xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      let response = JSON.parse(xhr.responseText);
      if (xhr.status === 200) {
        buildTable(response.data);
        setButtonStates(true);
      } else {
        alert(response.err);
      }
    }
  };
  xhr.open(method, url, true);
  xhr.send();
}

// Function to handle table row click
function handleTableClick(evt) {
  let elem = evt.target;
  if (elem.nodeName !== "TD") return;
  clearRows();
  let row = elem.parentElement;
  row.classList.add("selected");
  populateInput();
  setButtonStates(true);
  setInputPanel(true);
}

// Function to clear row selections
function clearRows() {
  let rows = document.querySelectorAll("tr");
  for (let i = 0; i < rows.length; i++) {
    rows[i].classList.remove("selected");
  }
}

// Function to show or hide input panel
function setInputPanel(value) {
  let inputPanel = document.querySelector(".inputArea");
  if (value) {
    inputPanel.classList.remove("hidden");
  } else {
    inputPanel.classList.add("hidden");
  }
  let confirmDelete = document.querySelector(".confirmDelete");
  confirmDelete.classList.add("hidden");
}

// Function to populate input fields from the selected row
function populateInput() {
  let row = document.querySelector(".selected");
  let cells = row.querySelectorAll("td");
  let id = Number(cells[0].innerHTML);
  let category = cells[1].innerHTML;
  let description = cells[2].innerHTML;
  let price = Number(cells[3].innerHTML);
  let vegetarian = cells[4].innerHTML;
  let radVeg = document.querySelector("#vegetarianCategory");
  if (vegetarian === "Yes") {
    radVeg.checked = true;
  } else {
    radVeg.checked = false;
  }
  document.querySelector("#itemID").value = id;
  document.querySelector("#itemCategory").value = category;
  document.querySelector("#descriptionCategory").value = description;
  document.querySelector("#priceCategory").value = price;
}

// Function to enable or disable update and delete buttons
function setButtonStates(value) {
  let updtButton = document.querySelector(".btnUpdate");
  let dltButton = document.querySelector(".btnDelete");
  if (value) {
    updtButton.removeAttribute("disabled");
    dltButton.removeAttribute("disabled");
  } else {
    updtButton.setAttribute("disabled", "disabled");
    dltButton.setAttribute("disabled", "disabled");
  }
}

// Function to handle adding a new item
function addItem() {
  setInputPanel(true);
  buttonsAcceptCancel(true);
  clearRows();
  clearInput();
  setIdInput(true);
  addOrUpdate = "ADD";
  disableDelete(true);
}

// Function to handle updating an existing item
function updateItem() {
  setInputPanel(true);
  disableDelete(true);
  buttonsAcceptCancel(true);
  setIdInput(true);
  populateInput();
  let elem = document.querySelector("#itemID");
  elem.setAttribute("disabled", "disabled");
  addOrUpdate = "UPDATE";
}

// Function to handle deleting an item
function deleteItem() {
  clearInput();
  setInputPanel(true);
  setIdInput(false);
  populateInput();
  let elem = document.querySelector(".selected");
  let id = Number(elem.querySelector("td").innerHTML);
  let url = "http://localhost:8000/api/menuitems/" + id;
  let method = "DELETE";

  let xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      let resp = JSON.parse(xhr.responseText);
      if (xhr.status === 200) {
        if (resp.data) {
          alert("delete successful");
        }
        updateTable();
        clearInput();
        clearRows();
        setInputPanel(false);
      } else {
        alert(resp.err);
      }
    }
  };
  xhr.open(method, url, true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send();
}

// Function to handle accepting changes (add or update)
function acceptChanges() {
  let id = Number(document.querySelector("#itemID").value);
  let category = document.querySelector("#itemCategory").value;
  let description = document.querySelector("#descriptionCategory").value;
  let price = Number(document.querySelector("#priceCategory").value);
  let vegetarian = document.querySelector("#vegetarianCategory").checked;

  try {
    let obj = { id, category, description, price, vegetarian };
    let error = validateInputs(obj);
    if (error) {
      alert(error);
      return;
    }

    let url = "http://localhost:8000/api/menuitems/" + id;
    let method = addOrUpdate === "ADD" ? "POST" : "PUT";

    let xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            let resp = JSON.parse(xhr.responseText);
            if (addOrUpdate === "ADD") {
              alert("Add successful");
            } else {
              alert("Update successful");
              updateTable();
            }
            updateTable();
          } catch (e) {
            // Handle cases where the response isn't JSON
            console.error("Error parsing JSON:", e);
            console.error("Response:", xhr.responseText);
            alert("An unexpected error occurred: " + xhr.responseText);
          }
        } else {
          try {
            let resp = JSON.parse(xhr.responseText);
            alert(
              "An error occurred while attempting to " +
                (addOrUpdate === "ADD" ? "add" : "update") +
                " this item:\n\n" +
                resp.err
            );
          } catch (e) {
            // Handle cases where the response isn't JSON
            console.error("Error parsing JSON:", e);
            console.error("Response:", xhr.responseText);
            alert("An error occurred: " + xhr.responseText);
          }
        }
      }
    };
    xhr.open(method, url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(JSON.stringify(obj));
  } catch (err) {
    alert(err);
  }
}

// Redefinition of updateTable (possible unintentional duplication)
function updateTable() {
  let url = "http://localhost:8000/api/menuitems";
  let method = "GET";
  let xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      try {
        let response = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          buildTable(response.data);
          //setButtonStates(false);
        } else {
          alert(response.err);
        }
      } catch (e) {
        console.error("Error parsing JSON:", e);
        console.error("Response:", xhr.responseText);
        alert("An unexpected error occurred: " + xhr.responseText);
      }
    }
  };
  xhr.open(method, url, true);
  xhr.send();
}

// Redefinition of buildTable (possible unintentional duplication)
function buildTable(data) {
  let element = document.querySelector(".tableArea");
  let htmlString =
    "<table><tr><th>ID</th><th>Category</th><th>Description</th><th>Price</th><th>Vegetarian</th></tr>";

  for (let i = 0; i < data.length; i++) {
    htmlString += "<tr><td>" + data[i].id + "</td>";
    htmlString += "<td>" + data[i].category + "</td>";
    htmlString += "<td>" + data[i].description + "</td>";
    htmlString += "<td>" + data[i].price + "</td>";
    htmlString += "<td>" + (data[i].vegetarian ? "Yes" : "No") + "</td></tr>";
  }

  htmlString += "</table>";
  element.innerHTML = htmlString;
}

// Function to handle canceling changes
function cancelChanges() {
  setInputPanel(false);
  clearInput();
  clearRows();
  buttonsAcceptCancel(true);
}

// Function to clear input fields
function clearInput() {
  document.querySelector("#itemID").value = 0;
  document.querySelector("#itemCategory").value = "";
  document.querySelector("#descriptionCategory").value = "";
  document.querySelector("#priceCategory").value = 0;
  document.querySelector("#vegetarianCategory").checked = false;
}

// Function to enable or disable input fields
function setIdInput(value) {
  let elem = document.querySelector("#itemID");
  let item = document.querySelector("#itemCategory");
  let description = document.querySelector("#descriptionCategory");
  let price = document.querySelector("#priceCategory");
  let vegetarian = document.querySelector("#vegetarianCategory");
  if (value) {
    elem.removeAttribute("disabled");
    item.removeAttribute("disabled");
    description.removeAttribute("disabled");
    price.removeAttribute("disabled");
    vegetarian.removeAttribute("disabled");
  } else {
    elem.setAttribute("disabled", "disabled");
    item.setAttribute("disabled", "disabled");
    description.setAttribute("disabled", "disabled");
    price.setAttribute("disabled", "disabled");
    vegetarian.setAttribute("disabled", "disabled");
  }
}

// Function to enable or disable accept and cancel buttons
function buttonsAcceptCancel(value) {
  let accept = document.querySelector(".btnAccept");
  let cancel = document.querySelector(".btnCancel");
  if (value) {
    accept.removeAttribute("disabled");
    cancel.removeAttribute("disabled");
  } else {
    accept.setAttribute("disabled", "disabled");
    cancel.setAttribute("disabled", "disabled");
  }
}

// Function to validate inputs
function validateInputs(obj) {
  let error = "Issue(s) occurred while processing:\n\n";
  let issueCount = 0;
  if (obj.id < 100 || obj.id > 999) {
    error += "The ID must be a number between 100 and 999.\n";
    issueCount++;
  }
  if (obj.category.length !== 3) {
    error += "The category must be three letters long.\n";
    issueCount++;
  }
  if (obj.price < 0 || isNaN(obj.price)) {
    error += "The price must be a positive numeric value.\n";
    issueCount++;
  }
  if (issueCount > 0) {
    error += "\n\nPlease amend these issues before continuing.";
    return error;
  }
}
