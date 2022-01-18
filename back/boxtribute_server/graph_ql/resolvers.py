"""GraphQL resolver functionality"""
from ariadne import MutationType, ObjectType, QueryType, convert_kwargs_to_snake_case
from peewee import fn

from flask import g

from ..authz import authorize
from ..box_transfer.agreement import (
    accept_transfer_agreement,
    cancel_transfer_agreement,
    create_transfer_agreement,
    reject_transfer_agreement,
    retrieve_transfer_agreement_bases,
)
from ..box_transfer.shipment import (
    cancel_shipment,
    create_shipment,
    send_shipment,
    update_shipment,
)
from ..enums import HumanGender, TransferAgreementState, TransferAgreementType
from ..models.crud import (
    create_beneficiary,
    create_box,
    create_qr_code,
    update_beneficiary,
    update_box,
)
from ..models.definitions.base import Base
from ..models.definitions.beneficiary import Beneficiary
from ..models.definitions.box import Box
from ..models.definitions.location import Location
from ..models.definitions.organisation import Organisation
from ..models.definitions.product import Product
from ..models.definitions.product_category import ProductCategory
from ..models.definitions.qr_code import QrCode
from ..models.definitions.shipment import Shipment
from ..models.definitions.shipment_detail import ShipmentDetail
from ..models.definitions.size import Size
from ..models.definitions.transaction import Transaction
from ..models.definitions.transfer_agreement import TransferAgreement
from ..models.definitions.user import User
from ..models.definitions.x_beneficiary_language import XBeneficiaryLanguage
from .pagination import load_into_page

query = QueryType()
mutation = MutationType()
object_types = []


def _register_object_type(name):
    object_type = ObjectType(name)
    object_types.append(object_type)
    return object_type


base = _register_object_type("Base")
beneficiary = _register_object_type("Beneficiary")
box = _register_object_type("Box")
location = _register_object_type("Location")
organisation = _register_object_type("Organisation")
product = _register_object_type("Product")
product_category = _register_object_type("ProductCategory")
qr_code = _register_object_type("QrCode")
shipment = _register_object_type("Shipment")
transfer_agreement = _register_object_type("TransferAgreement")
user = _register_object_type("User")


def _base_filter_condition(permission):
    """Derive filter condition for given permission depending the current user's
    base-specific permissions. See also `auth.requires_auth()`.
    """
    base_ids = g.user["permissions"][permission]
    if base_ids is None:
        # Permission granted for all bases
        return True
    return Base.id << base_ids


@user.field("bases")
@query.field("bases")
def resolve_bases(_, info):
    authorize(permission="base:read")
    return Base.select().where(_base_filter_condition("base:read"))


@query.field("base")
def resolve_base(_, info, id):
    authorize(permission="base:read", base_id=int(id))
    return Base.get_by_id(id)


@query.field("beneficiary")
def resolve_beneficiary(_, info, id):
    beneficiary = Beneficiary.get_by_id(id)
    authorize(permission="beneficiary:read", base_id=beneficiary.base_id)
    return beneficiary


@query.field("users")
def resolve_users(_, info):
    authorize(permission="user:read")
    return User.select()


@query.field("user")
def resolve_user(_, info, id):
    authorize(permission="user:read")
    authorize(user_id=int(id))
    return User.get_by_id(id)


@query.field("qrExists")
@convert_kwargs_to_snake_case
def resolve_qr_exists(_, info, qr_code):
    authorize(permission="qr:read")
    try:
        QrCode.get_id_from_code(qr_code)
    except QrCode.DoesNotExist:
        return False
    return True


@query.field("qrCode")
@convert_kwargs_to_snake_case
def resolve_qr_code(_, info, qr_code):
    authorize(permission="qr:read")
    return QrCode.get(QrCode.code == qr_code)


@query.field("product")
def resolve_product(_, info, id):
    product = Product.get_by_id(id)
    authorize(permission="product:read", base_id=product.base_id)
    return product


@query.field("box")
@convert_kwargs_to_snake_case
def resolve_box(_, info, label_identifier):
    box = (
        Box.select(Box, Location)
        .join(Location)
        .where(Box.label_identifier == label_identifier)
        .get()
    )
    authorize(permission="stock:read", base_id=box.location.base_id)
    return box


@query.field("location")
@box.field("location")
def resolve_location(obj, info, id=None):
    location = obj.location if id is None else Location.get_by_id(id)
    authorize(permission="location:read", base_id=location.base_id)
    return location


@query.field("organisation")
def resolve_organisation(_, info, id):
    authorize(organisation_id=int(id))
    return Organisation.get_by_id(id)


@query.field("productCategory")
def resolve_product_category(_, info, id):
    authorize(permission="category:read")
    return ProductCategory.get_by_id(id)


@query.field("transferAgreement")
def resolve_transfer_agreement(_, info, id):
    authorize(permission="transfer_agreement:read")
    return TransferAgreement.get_by_id(id)


@query.field("shipment")
def resolve_shipment(_, info, id):
    authorize(permission="shipment:read")
    return Shipment.get_by_id(id)


@query.field("productCategories")
def resolve_product_categories(_, info):
    authorize(permission="category:read")
    return ProductCategory.select()


@query.field("organisations")
def resolve_organisations(_, info):
    return Organisation.select()


@query.field("locations")
def resolve_locations(_, info):
    authorize(permission="location:read")
    return Location.select().join(Base).where(_base_filter_condition("location:read"))


@query.field("products")
@convert_kwargs_to_snake_case
def resolve_products(_, info, pagination_input=None):
    authorize(permission="product:read")
    return load_into_page(
        Product,
        _base_filter_condition("product:read"),
        selection=Product.select().join(Base),
        pagination_input=pagination_input,
    )


@query.field("beneficiaries")
@convert_kwargs_to_snake_case
def resolve_beneficiaries(_, info, pagination_input=None):
    authorize(permission="beneficiary:read")
    return load_into_page(
        Beneficiary,
        _base_filter_condition("beneficiary:read"),
        selection=Beneficiary.select().join(Base),
        pagination_input=pagination_input,
    )


@query.field("transferAgreements")
def resolve_transfer_agreements(_, info, states=None):
    authorize(permission="transfer_agreement:read")
    user_organisation_id = g.user["organisation_id"]
    states = states or list(TransferAgreementState)
    return TransferAgreement.select().where(
        (
            (TransferAgreement.source_organisation == user_organisation_id)
            | (TransferAgreement.target_organisation == user_organisation_id)
        )
        & (TransferAgreement.state << states)
    )


@query.field("shipments")
def resolve_shipments(_, info):
    authorize(permission="shipment:read")
    user_organisation_id = g.user["organisation_id"]
    return (
        Shipment.select()
        .join(TransferAgreement)
        .where(
            (TransferAgreement.source_organisation == user_organisation_id)
            | (TransferAgreement.target_organisation == user_organisation_id)
        )
    )


@beneficiary.field("tokens")
def resolve_beneficiary_tokens(beneficiary_obj, info):
    authorize(permission="transaction:read")
    # If the beneficiary has no transactions yet, the select query returns None
    return (
        Transaction.select(fn.sum(Transaction.count))
        .where(Transaction.beneficiary == beneficiary_obj.id)
        .scalar()
        or 0
    )


@beneficiary.field("isRegistered")
def resolve_beneficiary_is_registered(beneficiary_obj, info):
    return not beneficiary_obj.not_registered


@beneficiary.field("languages")
def resolve_beneficiary_languages(beneficiary_obj, info):
    return [
        x.language.id
        for x in XBeneficiaryLanguage.select().where(
            XBeneficiaryLanguage.beneficiary == beneficiary_obj.id
        )
    ]


@beneficiary.field("gender")
def resolve_beneficiary_gender(beneficiary_obj, info):
    return HumanGender(beneficiary_obj.gender)


@box.field("state")
def resolve_box_state(box_obj, info):
    # Instead of a BoxState instance return an integer for EnumType conversion
    return box_obj.state_id


@location.field("boxState")
def resolve_location_box_state(location_obj, info):
    # Instead of a BoxState instance return an integer for EnumType conversion
    return location_obj.box_state.id


@mutation.field("createQrCode")
@convert_kwargs_to_snake_case
def resolve_create_qr_code(_, info, box_label_identifier=None):
    authorize(permission="qr:write")
    authorize(permission="stock:write")
    return create_qr_code(box_label_identifier=box_label_identifier)


@mutation.field("createBox")
@convert_kwargs_to_snake_case
def resolve_create_box(_, info, box_creation_input):
    authorize(permission="stock:write")
    box_creation_input["created_by"] = g.user["id"]
    return create_box(box_creation_input)


@mutation.field("updateBox")
@convert_kwargs_to_snake_case
def resolve_update_box(_, info, box_update_input):
    authorize(permission="stock:write")
    box_update_input["last_modified_by"] = g.user["id"]
    return update_box(box_update_input)


@mutation.field("createBeneficiary")
@convert_kwargs_to_snake_case
def resolve_create_beneficiary(_, info, beneficiary_creation_input):
    authorize(
        permission="beneficiary:write", base_id=beneficiary_creation_input["base_id"]
    )
    beneficiary_creation_input["created_by"] = g.user["id"]
    return create_beneficiary(beneficiary_creation_input)


@mutation.field("updateBeneficiary")
@convert_kwargs_to_snake_case
def resolve_update_beneficiary(_, info, beneficiary_update_input):
    # Use target base ID if specified, otherwise skip enforcing base-specific authz
    authorize(
        permission="beneficiary:write",
        base_id=beneficiary_update_input.get("base_id"),
    )
    beneficiary_update_input["last_modified_by"] = g.user["id"]
    return update_beneficiary(beneficiary_update_input)


@mutation.field("createTransferAgreement")
@convert_kwargs_to_snake_case
def resolve_create_transfer_agreement(_, info, creation_input):
    authorize(permission="transfer_agreement:write")
    return create_transfer_agreement(**creation_input, user=g.user)


@mutation.field("acceptTransferAgreement")
def resolve_accept_transfer_agreement(_, info, id):
    authorize(permission="transfer_agreement:write")
    agreement = TransferAgreement.get_by_id(id)
    authorize(organisation_id=agreement.target_organisation_id)
    return accept_transfer_agreement(id=id, user=g.user)


@mutation.field("rejectTransferAgreement")
def resolve_reject_transfer_agreement(_, info, id):
    authorize(permission="transfer_agreement:write")
    agreement = TransferAgreement.get_by_id(id)
    authorize(organisation_id=agreement.target_organisation_id)
    return reject_transfer_agreement(id=id, user=g.user)


@mutation.field("cancelTransferAgreement")
def resolve_cancel_transfer_agreement(_, info, id):
    authorize(permission="transfer_agreement:write")
    agreement = TransferAgreement.get_by_id(id)
    authorize(
        organisation_ids=[
            agreement.source_organisation_id,
            agreement.target_organisation_id,
        ]
    )
    return cancel_transfer_agreement(id=id, user_id=g.user["id"])


@mutation.field("createShipment")
@convert_kwargs_to_snake_case
def resolve_create_shipment(_, info, creation_input):
    authorize(permission="shipment:write")
    agreement = TransferAgreement.get_by_id(creation_input["transfer_agreement_id"])
    organisation_ids = [agreement.source_organisation_id]
    if agreement.type == TransferAgreementType.Bidirectional:
        organisation_ids.append(agreement.target_organisation_id)
    authorize(organisation_ids=organisation_ids)
    return create_shipment(**creation_input, user=g.user)


@mutation.field("updateShipment")
@convert_kwargs_to_snake_case
def resolve_update_shipment(_, info, update_input):
    authorize(permission="shipment:write")
    return update_shipment(**update_input, user=g.user)


@mutation.field("cancelShipment")
def resolve_cancel_shipment(_, info, id):
    authorize(permission="shipment:write")
    shipment = Shipment.get_by_id(id)
    authorize(
        organisation_ids=[
            shipment.transfer_agreement.source_organisation_id,
            shipment.transfer_agreement.target_organisation_id,
        ]
    )
    return cancel_shipment(id=id, user=g.user)


@mutation.field("sendShipment")
def resolve_send_shipment(_, info, id):
    authorize(permission="shipment:write")
    shipment = Shipment.get_by_id(id)
    authorize(organisation_id=shipment.source_base.organisation_id)
    return send_shipment(id=id, user=g.user)


@base.field("locations")
def resolve_base_locations(base_obj, info):
    authorize(permission="location:read")
    return Location.select().where(Location.base == base_obj.id)


@base.field("beneficiaries")
@convert_kwargs_to_snake_case
def resolve_base_beneficiaries(base_obj, info, pagination_input=None):
    authorize(permission="beneficiary:read")
    base_filter_condition = Beneficiary.base == base_obj.id
    return load_into_page(
        Beneficiary, base_filter_condition, pagination_input=pagination_input
    )


@location.field("boxes")
@convert_kwargs_to_snake_case
def resolve_location_boxes(location_obj, info, pagination_input=None):
    authorize(permission="stock:read")
    location_filter_condition = Box.location == location_obj.id
    return load_into_page(
        Box, location_filter_condition, pagination_input=pagination_input
    )


@organisation.field("bases")
def resolve_organisation_bases(organisation_obj, info):
    authorize(permission="base:read")
    return Base.select().where(Base.organisation_id == organisation_obj.id)


@product.field("gender")
def resolve_product_gender(product_obj, info):
    # Instead of a ProductGender instance return an integer for EnumType conversion
    return product_obj.gender.id


@product.field("sizes")
def resolve_product_sizes(product_id, info):
    product = Product.get_by_id(product_id)
    sizes = Size.select(Size.label).where(Size.seq == product.size_range.seq)
    return [size.label for size in sizes]


@product_category.field("hasGender")
def resolve_product_category_has_gender(product_category_obj, info):
    # Only categories derived from 'Clothing' (ID 12) have gender information
    return product_category_obj.parent_id == 12


@product_category.field("products")
@convert_kwargs_to_snake_case
def resolve_product_category_products(
    product_category_obj, info, pagination_input=None
):
    authorize(permission="product:read")
    category_filter_condition = Product.category == product_category_obj.id
    return load_into_page(
        Product, category_filter_condition, pagination_input=pagination_input
    )


@qr_code.field("box")
def resolve_qr_code_box(qr_code_obj, info):
    authorize(permission="stock:read")
    return Box.get(Box.qr_code == qr_code_obj.id)


@shipment.field("details")
def resolve_shipment_details(shipment_obj, info):
    return ShipmentDetail.select().where(
        (ShipmentDetail.shipment == shipment_obj.id)
        & (ShipmentDetail.deleted_on.is_null())
    )


@transfer_agreement.field("sourceBases")
def resolve_transfer_agreement_source_bases(transfer_agreement_obj, info):
    return retrieve_transfer_agreement_bases(
        transfer_agreement=transfer_agreement_obj, kind="source"
    )


@transfer_agreement.field("targetBases")
def resolve_transfer_agreement_target_bases(transfer_agreement_obj, info):
    return retrieve_transfer_agreement_bases(
        transfer_agreement=transfer_agreement_obj, kind="target"
    )


@transfer_agreement.field("shipments")
def resolve_transfer_agreement_shipments(transfer_agreement_obj, info):
    authorize(permission="shipment:read")
    return Shipment.select().where(
        Shipment.transfer_agreement == transfer_agreement_obj.id
    )


@user.field("organisation")
def resolve_user_organisation(obj, info):
    return Organisation.get_by_id(g.user["organisation_id"])
