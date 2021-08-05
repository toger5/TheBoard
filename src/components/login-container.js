import { hideLoading, showLoading } from "../main";
import { AutoDiscovery } from "matrix-js-sdk";

const loginContainerTemplate = document.createElement('template');
loginContainerTemplate.innerHTML = /*html*/`
<link href="style.css" rel="stylesheet" type="text/css">
<style>
    span {
        font-size: 3em;
        white-space: pre;
        font-weight: 100;
    }
    input {
        width: 100%;
        padding: 12px 20px;
        margin: 8px 0;
        display: inline-block;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
    }
    button.submit {
        width: 100%;
        background-color: #FFAF50;
        background-color: #4CAF50;
        color: white;
        padding: 14px 20px;
        margin: 8px 0;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
</style>
<div class='center-container' id='login-container'>
    <p>
        <span>The Board</span>
        <span style='font-size: 1em;'> (alpha `+process.env.PACKAGE_VERSION+ /*html*/`)</span>
    </p>
    <form action="javascript:void(0);" onsubmit="()=>{return false;}">
    <label for='username'>Username:</label><br>
    <input type='text' id='username' name='username' autocomplete="username" placeholder='Your matrix id...'><br>
    <label for='password'>Password:</label><br>
    <input type='password' id='password' name='password' autocomplete="current-password" placeholder='your password...'><br>
    <button id='login-submit' class='submit'>Log in</button>
    </form>
    <label for='server'>Server:</label><br>
    <input type='text' id='server-url' name='server' placeholder='Server url'><br>
</div>
`
export class LoginContainer extends HTMLElement {
    constructor() {
        super();
    }
    checkUsername(username) {
        let re = new RegExp("@[a-zA-Z0-9_.+-]+\\:[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$")
        if (re.test(username)) {
            let serverDomain = username.split(":")[1];
            showLoading("Getting homeserver Information for domain " + serverDomain);
            AutoDiscovery.findClientConfig(serverDomain)
                .then((clientConf) => {
                    hideLoading();
                    let baseUrl = clientConf["m.homeserver"].base_url;
                    if (baseUrl) {
                        this.shadowRoot.querySelector("#server-url").value = baseUrl;
                    }
                })
            return true
        }
        return false
    }
    hide() {
        let login = this.shadowRoot.querySelector("#login-container");
        login.style.display = "none"
    }
    loginClicked() {

        function checkpwd(pwd) {
            console.log("pwd to check: ", pwd);

            return pwd.length > 1;
        }
        function checkServerUrl(baseUrl) {
            return baseUrl.length > 5
        }
        let baseUrl = this.shadowRoot.querySelector("#server-url").value;
        let username = this.shadowRoot.querySelector("#username").value;
        let pwd = this.shadowRoot.querySelector("#password").value;

        console.log("username to check: ", username);
        if (checkpwd(pwd) && this.checkUsername(username) && checkServerUrl(baseUrl)) {
            appData.matrixClient.login(username, pwd, baseUrl, ()=>{this.hide()});
        } else {
            showLoading("username or password dont have the correct format")
        }
    }

    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        let content = loginContainerTemplate.content;
        content.getElementById("login-submit").onclick = (ev) => { this.loginClicked() }
        content.getElementById("username").onchange = (el) => { this.checkUsername(el.target.value) }
        var pwd_input = content.getElementById("password");
        pwd_input.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                event.preventDefault();
                content.getElementById("login-submit").click();
            }
        });
        this.shadowRoot.appendChild(content);
    }
}
if (!customElements.get('login-container')) {
    customElements.define('login-container', LoginContainer);
}