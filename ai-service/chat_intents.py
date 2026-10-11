"""Whole-word intent matching without provider calls or model dependencies."""
import re


def matches_keyword(message, keyword):
    return re.search(r'(?<!\w)' + re.escape(keyword.casefold()) + r'(?!\w)', message.casefold()) is not None
