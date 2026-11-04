type StorySource = readonly [institution: string, title: string, url: string];

type Story = {
  id: string;
  date: string;
  label: string;
  place: string;
  title: string;
  text: string;
  sources: readonly [StorySource, StorySource, ...StorySource[]];
};

export const stories: readonly Story[] = [
  {
    id: "opium", date: "1840-06", label: "1840—1842", place: "东南沿海 · 南京", title: "从海疆到南京",
    text: "1840年6月，英国对中国发动第一次鸦片战争，战火从海上进入中国沿岸。1842年8月，清政府在英军进逼之下与英方签订《南京条约》。",
    sources: [
      ["中国国家博物馆", "鸦片烟具", "https://www.chnmuseum.cn/zp/zpml/201812/t20181218_25802.shtml"],
      ["南京市委党史工作办公室", "《南京条约》抄本及静海寺纪念馆采访", "https://dsb.nanjing.gov.cn/gzdt/202107/t20210714_3036039.html"],
    ],
  },
  {
    id: "jiawu", date: "1894", label: "1894—1895", place: "黄海 · 辽东 · 山东", title: "甲午海陆战火",
    text: "1894年，甲午战争爆发，战事由朝鲜及附近海域延伸至辽东和山东半岛。北洋舰队在战争中覆灭。1895年，清政府被迫同日本签订《马关条约》。",
    sources: [
      ["故宫博物院", "甲午战争", "https://www.dpm.org.cn/lemmas/241772.html"],
      ["香港海防博物馆与中国甲午战争博物院", "甲午展览", "https://hk.waranddefence.museum/sc/web/mcd/conflict-and-war.html"],
      ["外交部", "《马关条约》", "https://www.fmprc.gov.cn/diaoyudao/chn/flfg/gjty/201510/t20151009_8560614.htm"],
    ],
  },
  {
    id: "mukden", date: "1931-09-18", label: "1931年9月18日", place: "沈阳 · 柳条湖", title: "九一八事变",
    text: "9月18日夜，日本关东军在沈阳柳条湖附近制造铁路爆破事件，嫁祸中国军队，随后袭击北大营并进攻沈阳。这一事变成为中国人民抗日战争的起点。",
    sources: [
      ["中国国家博物馆", "抗战历史中的九一八事变", "https://www.chnmuseum.cn/zx/gbxw/202509/t20250918_272757.shtml"],
      ["文化和旅游部网站 · 中国旅游报", "走进九一八历史博物馆", "https://www.mct.gov.cn/wlbphone/wlbydd/xxfb/qglb/ln/202509/t20250919_962291.html"],
    ],
  },
  {
    id: "lugou", date: "1937-07-07", label: "1937年7月7日", place: "北平 · 卢沟桥", title: "卢沟桥畔的抵抗",
    text: "日军以士兵失踪为由，要求进入宛平城搜查，中国守军拒绝了这一要求。日军随即发动攻击，第二十九军官兵应战。七七事变后，中国进入全民族抗战阶段。",
    sources: [
      ["中国国家博物馆", "《我们对卢沟桥事件的主张》", "https://www.chnmuseum.cn/zp/zpml/gmww/202112/t20211214_253214.shtml"],
      ["北京市丰台区委党史办", "卢沟桥畔浴血战", "https://www.bjft.gov.cn/fengtaishibao/html/2023-06/28/content_9501_16264559.htm"],
    ],
  },
  {
    id: "victory", date: "1945-09-02", label: "1945年9月2日、9日", place: "东京湾 · 南京", title: "从签降到南京受降",
    text: "9月2日，日本代表签署向同盟国投降的文书。一周后，中国战区受降仪式在南京举行。国际签降与中国战区受降，留下了抗战胜利的两个时间坐标。",
    sources: [
      ["外交部", "日本投降书", "https://www.fmprc.gov.cn/diaoyudao/chn/flfg/gjty/201510/t20151009_8560602.html"],
      ["南京大学档案馆", "浴火重生 凯旋东还", "https://dawww.nju.edu.cn/info/1171/11661.htm"],
    ],
  },
  {
    id: "common-program", date: "1949-09-29", label: "1949年9月29日", place: "北京", title: "筹建新中国",
    text: "中国人民政治协商会议第一届全体会议通过《共同纲领》。这份文件就新中国的政权机构、经济和文教等方面作出规定，在当时发挥临时宪法的作用。",
    sources: [
      ["中国国家博物馆", "《中国人民政治协商会议共同纲领》馆藏", "https://www.chnmuseum.cn/zp/zpml/gmww/202104/t20210406_249569.shtml"],
      ["上海党史网", "《共同纲领》的起草与审议", "https://www.ccphistory.org.cn/shds/dsxx/content/8f100e12-41b0-4345-b2df-4be5ea58be64.html"],
    ],
  },
  {
    id: "founding", date: "1949-10-01", label: "1949年10月1日", place: "北京 · 天安门", title: "开国大典",
    text: "10月1日下午，开国大典在北京举行。毛泽东在天安门城楼宣告中华人民共和国中央人民政府成立。公告文物与当年的彩色影像，分别记录下这个历史节点。",
    sources: [
      ["中国国家博物馆", "《中华人民共和国中央人民政府公告》馆藏", "https://www.chnmuseum.cn/zp/zpml/gshww/202103/t20210331_249356.shtml"],
      ["外交部", "开国大典的彩色胶片", "https://www.mfa.gov.cn/ziliao_674904/zt_674979/dnzt_674981/qtzt/zggcddwjw100ggs/jszgddzg/202208/t20220824_10750397.shtml"],
    ],
  },
];
