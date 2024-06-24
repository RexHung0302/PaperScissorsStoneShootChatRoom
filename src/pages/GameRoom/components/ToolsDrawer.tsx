import { Col, Drawer, Row } from "antd";
import { DrawerClassNames, DrawerStyles } from "antd/es/drawer/DrawerPanel";
import { useToolsDrawerController } from "../useToolsDrawerController";

interface Props {
  visible: boolean;
  onClose: () => void;
  styles?: DrawerStyles;
  classNames?: DrawerClassNames;
  onCloseToolsDrawer: () => void;
}

export const ToolsDrawer = ({ visible, styles, classNames, onClose, onCloseToolsDrawer }: Props) => {
  const { toolsItem, contextHolder, handleClickToolsIcon } = useToolsDrawerController({ onCloseToolsDrawer });

  return (
    <Drawer
      key='tools-drawer'
      title="Tools Box"
      placement="bottom"
      height='auto'
      onClose={onClose}
      open={visible}
      styles={{
        ...styles,
      }}
      classNames={{
        ...classNames,
      }}
    >
      <Row gutter={[16, 32]}>
        {toolsItem.map(tool => (
          <Col
          span={6}
            key={tool.key}
            className="flex items-center justify-center"
            onClick={handleClickToolsIcon.bind(null, tool)}
          >
            <div className={tool.disabled ? 'text-slate-300 cursor-not-allowed' : 'cursor-pointer'}>
              {tool.icon}
            </div>
          </Col>
        ))}
      </Row>
      {contextHolder}
    </Drawer>
  )
};