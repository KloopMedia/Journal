import pytest
import numpy as np
from google.cloud.firestore_v1.document import DocumentReference

from .algolia_index import get_dict_with_id, clean_dict

id = '123'
title = 'Title'
description = 'description'


@pytest.fixture
def document():
    class Document:
        def __init__(self):
            self.id = id
            self.title = title
            self.description = description

        def to_dict(self):
            return {
                'id': self.id,
                'title': self.title,
                'description': self.description
            }

    return Document()


def test_get_dict_with_id(document):
    dict_with_id = get_dict_with_id(document)

    assert dict_with_id.get('objectID') == id
    assert dict_with_id.get('title') == title
    assert dict_with_id.get('description') == description


def test_clean_dict(document):
    doc_dict = document.to_dict()
    doc_dict.update({
        'ref': DocumentReference('collection', 'doc'),
        'nan_value': np.nan
    })
    result_dict = clean_dict(doc_dict)
    assert result_dict.get('ref') is None
    assert result_dict.get('nan_value') is None
