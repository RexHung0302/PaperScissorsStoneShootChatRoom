import { Button, Card, Col, Form, Image, Input, Modal, Row, Space } from "antd";
import { useGameHallController } from "./useGameHallController";
import LineIcon from '../../assets/line-icon.png';
import FacebookIcon from '../../assets/facebook-icon.png';
import { ThirdPartyLoginType } from "../../entities/Login";

/**
 * @description 遊戲大廳，輸入名稱後選擇輸入邀請碼進入遊戲或者創建遊戲房間
 * @returns JSX.Element
 */
export const GameHall = () => {
  const { form, formRules, contextHolder, inviteCodeForm, inViteCodeModalOpen, handleClickCreateRoom, handleClickJoinRoom, handleInviteModalClickOk, handleClickThirdPartyLogin, handleInviteModalClickCancel } = useGameHallController();

  return <div className="w-full h-full flex items-center justify-center">
    <Card title="Paper Scissors Stone Shoot" style={{ width: 300 }}>
      {/* 個人資訊表單 */}
      <Form
        form={form}
      >
        <Form.Item
          label="Name："
          name="name"
          required
          rules={formRules['name']}
        >
          <Input />
        </Form.Item>
        
        <Form.Item noStyle>
          <Row gutter={[8, 16]}>
            <Col span={24} md={12}>
              <Button type="primary" className="w-full" onClick={handleClickCreateRoom}>Create Room</Button>
            </Col>
            <Col span={24} md={12}>
              <Button type="primary" className="w-full" onClick={handleClickJoinRoom}>Join Room</Button>
            </Col>
          </Row>
        </Form.Item>
        <div className="flex items-center justify-between gap-2 my-2">
          <hr className="flex-1" />
          <span>Third Party</span>
          <hr className="flex-1" />
        </div>
        <div className="flex item-center justify-center gap-2 w-full">
          <Image src={LineIcon} alt="Line" width={33} preview={false} className="cursor-not-allowed" onClick={() => handleClickThirdPartyLogin(ThirdPartyLoginType.Line)} />
          <Image src={FacebookIcon} alt="Facebook" width={33} preview={false} className="cursor-not-allowed" onClick={() => handleClickThirdPartyLogin(ThirdPartyLoginType.Facebook)} />
        </div>
      </Form>
    </Card>

    {/* 邀請碼彈窗 */}
    <Modal
        centered
        title="Join Room Invite Code"
        open={inViteCodeModalOpen}
        onOk={handleInviteModalClickOk}
        onCancel={handleInviteModalClickCancel}
        width={400}
      >
        <Form
          form={inviteCodeForm}
        >
          <Form.Item
            label="Invite Code："
            name="inviteCode"
            required
            rules={formRules['inviteCode']}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {contextHolder}
  </div>
};