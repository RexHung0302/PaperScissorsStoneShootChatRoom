import { useGameRoomController } from "./useGameRoomController";
import { IoIosArrowBack } from "react-icons/io";
import { SlMagnifier } from "react-icons/sl";
import { IoCallOutline } from "react-icons/io5";
import { GiHamburger } from "react-icons/gi";
import { FaTools } from "react-icons/fa";
import { IoIosSend } from "react-icons/io";
import { Input, Row, Spin, Tooltip } from "antd";
import { ChatTools } from "../../entities/Chat";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ChatTemplate } from "./components/ChatTemplate";
import { ToolsDrawer } from "./components/ToolsDrawer";
import { useContext } from "react";
import { GlobalContext } from "../../store/globalProvider";

dayjs.extend(relativeTime);

export const GameRoom = () => {
  const globalInfo = useContext(GlobalContext);
  const {
    roomId,
    chatText,
    gameList,
    onlineCount,
    chatHistory,
    isChatLoading,
    chatContentRef,
    contextHolder,
    toolsDrawerVisible,
    modalContextHolder,
    handleClickSendBtn,
    handleClickBackIcon,
    handleClickJoinGame,
    handleClickPunchGame,
    handleClickToolsIcon,
    handleChatInputChange,
    handleChatInputKeyDown,
    handleCloseToolsDrawer,
  } = useGameRoomController();

  return (
    <div className="w-full h-full max-w-[1240px] m-auto flex flex-col">
      <div className="w-full bg-[#263149] rounded-b-lg box-border font-bold h-[60px] flex items-center p-4 gap-2">
        <div className="flex items-center gap-2 truncate">
          <IoIosArrowBack className="cursor-pointer min-w-[20px]" onClick={handleClickBackIcon} />
          <Tooltip title={`${roomId}(${onlineCount})`} placement="bottom" trigger="click">
            <span className="truncate block">
              #{roomId} Game Room({onlineCount})
            </span>
          </Tooltip>
        </div>
        <div className="flex-1 flex items-center justify-end gap-4">
          <SlMagnifier className="cursor-not-allowed" onClick={() => handleClickToolsIcon(ChatTools.Magnifier)} />
          <IoCallOutline className="cursor-not-allowed" onClick={() => handleClickToolsIcon(ChatTools.Call)} />
          <GiHamburger className="cursor-not-allowed" onClick={() => handleClickToolsIcon(ChatTools.Hamburger)} />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto chat-room-content p-2" ref={chatContentRef}>
        <Row gutter={[8, 16]}>
          {chatHistory.map((chat, index) => {
            // TODO: 後續可以再擴充其他的聊天模板
            switch (chat.type) {
              default:
                return (
                  <ChatTemplate
                    chat={chat}
                    key={`chat_${index}_${chat.createdAt}`}
                    gameList={gameList}
                    keyText={index.toString()}
                    onClickJoinGame={handleClickJoinGame}
                    onClickPunchGame={handleClickPunchGame}
                  />
                );
            }
          })}
        </Row>
      </div>
      <div className="w-full bg-white box-border h-[40px] flex items-center p-4 gap-3 text-black">
        <Input
          value={chatText}
          placeholder="Type a message"
          onChange={handleChatInputChange}
          onKeyDown={handleChatInputKeyDown}
          disabled={isChatLoading}
        />
        <FaTools size={26} onClick={() => handleClickToolsIcon(ChatTools.Tools)} />
        <IoIosSend size={34} onClick={e => handleClickSendBtn(e)} />
      </div>
      <ToolsDrawer
        visible={toolsDrawerVisible}
        onClose={handleCloseToolsDrawer}
        onCloseToolsDrawer={handleCloseToolsDrawer}
        classNames={{
          header: '!px-4 !py-2'
        }}
      />
      {/* 全畫面的 Loading */}
      {globalInfo.loading && (
        <div className='w-full h-full flex items-center justify-center bg-[rgba(0,0,0,0.5)] fixed top-0 left-0 z-50'>
          <Spin spinning />
        </div>
      )}
      {contextHolder}
      {modalContextHolder}
    </div>
  );
};