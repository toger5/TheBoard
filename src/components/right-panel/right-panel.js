import jsxElem, { render } from "jsx-no-react";
import { promiseMapSeries } from "matrix-js-sdk/lib/utils";
import "./right-panel.css";
import userIcon from "./userIcon.svg"
import toolIcon from "./toolIcon.svg"
export class RightPanel {
  constructor() {
    this.rightPanelContainer = <div id='right-panel' class="container"></div>
    this.userList = []
    this.tabIndex = 0
    render(this.rightPanelContainer, document.body)
    this.update()
  }
  async updateMember(roomId) {
    let memDict = (await appData.matrixClient.client.getJoinedRoomMembers(roomId)).joined
    this.userList = Object.entries(memDict).map(e => {
      let returnDict = e[1]
      returnDict.avatar_url = appData.matrixClient.client.mxcUrlToHttp(returnDict.avatar_url, 40, 40, 'scale')
      return returnDict
    })
    this.update()
  }
  update() {
    let memberTab = {
      buttonProps:
      {
        onClick: () => { this.tabIndex = 0; this.update() },
        label: <img src={userIcon}></img>
      },
      container: <MemberList member={this.userList} />
    }
    let toolOptionsTab = {
      buttonProps:
      {
        onClick: () => { this.tabIndex = 1; this.update() },
        label: <img src={toolIcon}></img>
      },
      container: <div class="tab-container">GibtNixZuSehen</div>
    }
    let tabs = [memberTab, toolOptionsTab]

    this.rightPanelContainer.innerHTML = ''
    render(<Panel tabs={tabs} userList={this.userList} activeTab={this.tabIndex} />, this.rightPanelContainer);
  }
}

function UserContainerButton(props) { // onClick, label
  let btn = <button onClick={props.onClick}>{props.label}</button>
  if (props.active) { btn.classList.add("active-tab") }
  return btn
}

function Panel(props) { // props:{tabs, userList, activeTab}
  // let buttons = ["a", "b", "c"]
  return <div>
    <div class="buttons-bar">
      {props.tabs.map((tab, index) => {
        let p = { ...tab.buttonProps }
        p.active = (index === props.activeTab)
        return UserContainerButton(p)
      })}
    </div>
    <div>
      {props.tabs[props.activeTab].container}
    </div>
  </div>
}

function UserContainer(props) {
  return <div class="user-container"><div class="pb"><img src={props.user.avatar_url} alt={props.user.display_name[0].toUpperCase()} height="30" /></div> <div class='user-name-label'>{props.user.display_name}</div></div>
}

function MemberList(props) {
  return (<div id="scroll" class="tab-container">
    {props.member.length === 0 && (<p style="color:grey; text-align:center"> No room selected </p>)}
    {
      props.member.map(user => (
        <UserContainer user={user} />
      ))
    }
  </div>);
}