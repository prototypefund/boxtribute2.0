"""Create-Retrieve-Update-Delete operations on database models."""
import hashlib
import random

import peewee

from ..db import db
from ..enums import BoxState
from ..exceptions import BoxCreationFailed, RequestedResourceNotFound
from .definitions.beneficiary import Beneficiary
from .definitions.box import Box
from .definitions.qr_code import QrCode
from .definitions.x_beneficiary_language import XBeneficiaryLanguage
from .utils import utcnow

BOX_LABEL_IDENTIFIER_GENERATION_ATTEMPTS = 10


def create_box(data):
    """Insert information for a new Box in the database. Use current datetime
    and box state "InStock" by default. Generate an 8-digit sequence to identify the
    box. If the sequence is not unique, repeat the generation several times. If
    generation still fails, raise a BoxCreationFailed exception.
    """
    now = utcnow()
    qr_code = data.pop("qr_code", None)
    qr_id = QrCode.get_id_from_code(qr_code) if qr_code is not None else None

    for i in range(BOX_LABEL_IDENTIFIER_GENERATION_ATTEMPTS):
        try:
            new_box = Box.create(
                label_identifier="".join(random.choices("0123456789", k=8)),
                qr_code=qr_id,
                created_on=now,
                last_modified_on=now,
                last_modified_by=data["created_by"],
                state=BoxState.InStock,
                **data,
            )
            return new_box
        except peewee.IntegrityError as e:
            # peewee throws the same exception for different constraint violations.
            # E.g. failing "NOT NULL" constraint shall be directly reported
            if "Duplicate entry" not in str(e):
                raise
    raise BoxCreationFailed()


def update_box(data):
    """Look up an existing Box given a UUID, and update all requested fields.
    Insert timestamp for modification and return the box.
    """
    label_identifier = data.pop("label_identifier")
    box = Box.get(Box.label_identifier == label_identifier)

    for field, value in data.items():
        setattr(box, field, value)

    box.last_modified_on = utcnow()
    box.save()
    return box


def create_beneficiary(data):
    """Insert information for a new Beneficiary in the database. Update the
    languages in the corresponding cross-reference table.
    """
    now = utcnow()
    language_ids = data.pop("languages")
    family_head_id = data.pop("family_head_id", None)

    # Set is_signed field depending on signature
    data["is_signed"] = data.get("signature") is not None

    # Convert to gender abbreviation
    gender = data.pop("gender").value

    new_beneficiary = Beneficiary.create(
        base=data.pop("base_id"),
        family_head=family_head_id,
        not_registered=not data.pop("is_registered"),
        gender=gender,
        created_on=now,
        last_modified_on=now,
        last_modified_by=data["created_by"],
        # This is only required for compatibility with legacy DB
        seq=1 if family_head_id is None else 2,
        # These fields are required acc. to model definition
        deleted="0000-00-00 00:00:00",
        family_id=0,
        bicycle_ban_comment="",
        workshop_ban_comment="",
        **data,
    )
    for language_id in language_ids:
        XBeneficiaryLanguage.create(
            language=language_id, beneficiary=new_beneficiary.id
        )
    return new_beneficiary


def update_beneficiary(data):
    """Look up an existing Beneficiary given an ID, and update all requested fields,
    including the language cross-reference.
    Insert timestamp for modification and return the beneficiary.
    """
    beneficiary_id = data.pop("id")
    beneficiary = Beneficiary.get_by_id(beneficiary_id)

    # Handle any items with keys not matching the Model fields by popping off
    base_id = data.pop("base_id", None)
    if base_id is not None:
        beneficiary.base = base_id

    family_head_id = data.pop("family_head_id", None)
    if family_head_id is not None:
        beneficiary.family_head = family_head_id
    beneficiary.seq = 1 if family_head_id is None else 2

    registered = data.pop("is_registered", None)
    if registered is not None:
        beneficiary.not_registered = not registered

    if data.get("signature") is not None:
        beneficiary.is_signed = True

    language_ids = data.pop("languages", [])
    if language_ids:
        XBeneficiaryLanguage.delete().where(
            XBeneficiaryLanguage.beneficiary == beneficiary_id
        ).execute()
        for language_id in language_ids:
            XBeneficiaryLanguage.create(
                language=language_id, beneficiary=beneficiary_id
            )

    for field, value in data.items():
        setattr(beneficiary, field, value)

    beneficiary.last_modified_on = utcnow()
    beneficiary.save()
    return beneficiary


def create_qr_code(box_label_identifier=None):
    """Insert a new QR code in the database. Generate an MD5 hash based on its primary
    key. If a `box_label_identifier` is passed, look up the corresponding box (it is
    expected to exist) and associate the QR code with it.
    Return the newly created QR code.

    All operations are run inside an atomic transaction. If e.g. the box look-up fails,
    the operations are rolled back (i.e. no new QR code is inserted), and an exception
    is raised.
    """
    try:
        with db.database.atomic():
            new_qr_code = QrCode.create(created_on=utcnow())
            new_qr_code.code = hashlib.md5(str(new_qr_code.id).encode()).hexdigest()
            new_qr_code.save()

            if box_label_identifier is not None:
                box = Box.get(Box.label_identifier == box_label_identifier)
                box.qr_code = new_qr_code.id
                box.save()

        return new_qr_code

    except peewee.DoesNotExist:
        raise RequestedResourceNotFound()
