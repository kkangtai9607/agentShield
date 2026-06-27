"""文本规范化，降低编码/空白/大小写绕过风险。"""

import re
import unicodedata

# 常见零宽字符
_ZERO_WIDTH = re.compile(r"[\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]")

# 全角 → 半角映射（常见攻击变体）
_HOMOGLYPHS = str.maketrans({
    "ｓ": "s", "ｅ": "e", "ｃ": "c", "ｒ": "r", "ｔ": "t",
    "ａ": "a", "ｏ": "o", "ｉ": "i", "ｎ": "n", "ｇ": "g",
    "Ｓ": "S", "Ｅ": "E", "Ｃ": "C", "Ｒ": "R", "Ｔ": "T",
    "Ａ": "A", "Ｏ": "O", "Ｉ": "I", "Ｎ": "N", "Ｇ": "G",
    "　": " ",
})


def normalize_text(text: str) -> str:
    if not text:
        return ""
    t = unicodedata.normalize("NFKC", text)
    t = t.translate(_HOMOGLYPHS)
    t = _ZERO_WIDTH.sub("", t)
    t = t.replace("\r", " ").replace("\n", " ")
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def normalize_path(path: str) -> str:
    t = normalize_text(path).replace("\\", "/").lower()
    # 压缩路径分隔变体: s/e/c/r/e/t → secret 检测辅助
    t = re.sub(r"/+", "/", t)
    t = re.sub(r"\.+/", "", t)  # ../ 弱化
    t = t.replace("%2f", "/").replace("%2e", ".")
    return t


def normalize_sql(sql: str) -> str:
    t = normalize_text(sql).upper()
    t = re.sub(r"/\*.*?\*/", " ", t, flags=re.DOTALL)
    t = re.sub(r"/\*+|\*+/", " ", t)
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def normalize_shell(command: str) -> str:
    t = normalize_text(command).lower()
    t = re.sub(r"\s+", " ", t)
    return t.strip()


def contains_insensitive(haystack: str, needle: str) -> bool:
    return normalize_text(needle).lower() in normalize_text(haystack).lower()
