import dayjs from "dayjs";
import { useEffect, useState } from "react";

interface Props {
  timeStamp: number;
}

export const useTimeFormat = ({ timeStamp }: Props) => {
  // 判斷上下午
  const [timeText, setTimeText] = useState<string>('');

  useEffect(() => {
    // 判斷是否距離一天以上
    if (dayjs().diff(timeStamp, 'day') > 1) {
      // 月份/日期(星期幾)
      setTimeText(dayjs(timeStamp).format('MM/DD(ddddd)'));
    } else {
      // 上午下午 時:分
      setTimeText(dayjs(timeStamp).format('A hh:mm'));
    }
  }, [timeStamp]);

  return {
    timeText
  };
};