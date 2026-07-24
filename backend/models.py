from extensions import db
from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash

SUBSCRIPTION_STATUS_ACTIVE = 'active'
SUBSCRIPTION_STATUS_INACTIVE = 'inactive'
SUBSCRIPTION_STATUS_EXPIRED = 'expired'
SUBSCRIPTION_STATUS_VALUES = (
    SUBSCRIPTION_STATUS_ACTIVE,
    SUBSCRIPTION_STATUS_INACTIVE,
    SUBSCRIPTION_STATUS_EXPIRED
)


def serialize_datetime(value):
    if not value:
        return None

    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)

    return value.isoformat().replace('+00:00', 'Z')


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # email = db.Column(db.String(120), unique=True, nullable=False)
    username = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    # is_temporary_password = db.Column(db.Boolean, default=True)  # check if the password is temporary
    role = db.Column(db.Enum('admin', 'user'), default='user', nullable=False)


    # Relationships
    verified_vehicles = db.relationship('Vehicle', backref='verifier', foreign_keys='Vehicle.verified_by', lazy=True)
    verified_waivers = db.relationship('WaivedUser', backref='verifier', foreign_keys='WaivedUser.verified_by', lazy=True)
    
    def __repr__(self):
        return f"<User {self.username}>"
    
    def set_password(self, password):
        self.password = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password, password) 
    
    @classmethod
    def get_user_by_username(cls, username):
        return cls.query.filter_by(username = username).first()
    
    def save(self):
        db.session.add(self)
        db.session.commit()
    
    def delete(self):
        db.session.delete(self)
        db.session.commit()
    
        
    
class Vehicle(db.Model):
    __tablename__ = 'vehicles'
    
    id = db.Column(db.Integer, primary_key=True)
    license_plate = db.Column(db.String(20), nullable=False)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id', ondelete="SET NULL"), nullable=True)
    location = db.relationship('Location', backref='vehicles', lazy=True)
    # vehicle_type = db.Column(db.String(50))
    
    # Audit fields
    entry_time = db.Column(db.DateTime, default=datetime.utcnow)
    exit_time = db.Column(db.DateTime)
    status = db.Column(db.Enum('in', 'out'), default='in')
    
    #duration
    duration = db.Column(db.Interval, nullable=True)
    
    # Payment fields
    payment_status = db.Column(db.Enum('paid', 'not paid', 'waived', 'free'), default='not paid')
    payment_mode = db.Column(db.Enum('cash', 'card'), default=None)
    payable_amount = db.Column(db.Float, default=None)
    payment_processed_at = db.Column(db.DateTime, nullable=True)
    
    # Verification info
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    verified_at = db.Column(db.DateTime, default=datetime.utcnow)
    image_path = db.Column(db.Text)
    
    # Tracking fields
    vehicle_category = db.Column(db.String(50), default='Visitor') # 'Visitor', 'Tenant', 'Staff'
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)

    def to_dict(self):
        return {
            'id': self.id,
            'license_plate': self.license_plate,
            'location_id': self.location_id,
            'entry_time': serialize_datetime(self.entry_time),
            'exit_time': serialize_datetime(self.exit_time),
            'status': self.status,
            'duration': str(self.duration) if self.duration else None,
            'payment_status': self.payment_status,
            'payment_mode': self.payment_mode,
            'payable_amount': self.payable_amount,
            'payment_processed_at': serialize_datetime(self.payment_processed_at),
            'vehicle_category': self.vehicle_category,
            'tenant_id': self.tenant_id,
            'image_path': self.image_path
        }
    
    

class WaivedUser(db.Model):
    __tablename__ = 'waived_users' 

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    waiver_id = db.Column(db.String(50), nullable=False)
    waiver_category = db.Column(db.String(100), nullable=False)
    reason = db.Column(db.String(255), nullable=False)
    license_plate = db.Column(db.String(255), nullable=True) # To store multiple plates as comma-separated string
    mobile_number = db.Column(db.String(30), nullable=True)
    valid_from = db.Column(db.Date, nullable=True)
    valid_until = db.Column(db.Date, nullable=True)
    
    # Verification info
    verified_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    verified_at = db.Column(db.DateTime, default=datetime.utcnow)

class Pricing(db.Model):
    __tablename__ = 'pricing'

    id = db.Column(db.Integer, primary_key=True)
    pricing_type = db.Column(db.String(50), nullable=False) # 'Tenant Subscription' or 'Visitor Parking'
    vehicle_type = db.Column(db.String(50), nullable=False) # '4-Wheeler' or '2-Wheeler'
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    price = db.Column(db.Float, default=0.0) # For Tenant Subscription
    start_date = db.Column(db.Date) # For Tenant Subscription (validity period for the plan itself)
    end_date = db.Column(db.Date) # For Tenant Subscription
    duration_value = db.Column(db.Integer, default=1)
    duration_unit = db.Column(db.String(20), default='months')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    tiers = db.relationship('PricingTier', backref='pricing', lazy=True, cascade="all, delete-orphan")
    tenant_subscriptions = db.relationship('TenantSubscription', backref='subscription_plan', lazy=True)
    visitor_subscriptions = db.relationship('VisitorSubscription', backref='subscription_plan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'pricing_type': self.pricing_type,
            'vehicle_type': self.vehicle_type,
            'name': self.name,
            'description': self.description,
            'price': self.price,
            'duration_value': self.duration_value,
            'duration_unit': self.duration_unit,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'is_active': self.is_active,
            'tiers': [tier.to_dict() for tier in self.tiers],
            'created_at': serialize_datetime(self.created_at)
        }

class PricingTier(db.Model):
    __tablename__ = 'pricing_tiers'

    id = db.Column(db.Integer, primary_key=True)
    pricing_id = db.Column(db.Integer, db.ForeignKey('pricing.id'), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(20), nullable=False) # 'hour', 'day'
    price_omr = db.Column(db.Float, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'duration': self.duration,
            'unit': self.unit,
            'price_omr': self.price_omr
        }

class Tenant(db.Model):
    __tablename__ = 'tenants'

    id = db.Column(db.Integer, primary_key=True)
    tenant_name = db.Column(db.String(100), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    house_number = db.Column(db.String(100), nullable=True)
    block = db.Column(db.String(100), nullable=True)
    tenant_type = db.Column(db.String(50), default='Tenant')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    vehicles = db.relationship('TenantVehicle', backref='tenant', lazy=True, cascade="all, delete-orphan")
    subscriptions = db.relationship('TenantSubscription', backref='tenant', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_name': self.tenant_name,
            'phone_number': self.phone_number,
            'house_number': self.house_number,
            'block': self.block,
            'vehicles': [v.license_plate for v in self.vehicles],
            'tenant_type': self.tenant_type,
            'created_at': serialize_datetime(self.created_at)
        }

class TenantSubscription(db.Model):
    __tablename__ = 'tenant_subscriptions'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    subscription_plan_id = db.Column(db.Integer, db.ForeignKey('pricing.id'), nullable=True)
    
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    allocated_slots = db.Column(db.Integer, default=1) # Limit on simultaneous cars
    
    amount_paid = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(50))
    payment_status = db.Column(db.String(50), default='Pending')
    transaction_id = db.Column(db.String(100))
    payment_date = db.Column(db.Date)
    
    status = db.Column(
        db.Enum(*SUBSCRIPTION_STATUS_VALUES, name='tenant_subscription_status'),
        nullable=False,
        default=SUBSCRIPTION_STATUS_ACTIVE
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def is_active(self):
        return self.status == SUBSCRIPTION_STATUS_ACTIVE

    def get_effective_status(self, reference_date=None):
        today = reference_date or datetime.utcnow().date()
        stored_status = (self.status or SUBSCRIPTION_STATUS_ACTIVE).lower()

        if stored_status == SUBSCRIPTION_STATUS_INACTIVE:
            return 'Inactive'
        if stored_status == SUBSCRIPTION_STATUS_EXPIRED:
            return 'Expired'
        if self.end_date and self.end_date < today:
            return 'Expired'
        if self.start_date and self.start_date > today:
            return 'Scheduled'
        if stored_status == SUBSCRIPTION_STATUS_ACTIVE:
            return 'Active'
        return 'Inactive'

    def to_dict(self):
        effective_status = self.get_effective_status()
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'tenant_name': self.tenant.tenant_name if self.tenant else "Unknown",
            'phone_number': self.tenant.phone_number if self.tenant else "",
            'house_number': self.tenant.house_number if self.tenant else "",
            'block': self.tenant.block if self.tenant else "",
            'vehicles': [v.license_plate for v in self.tenant.vehicles] if self.tenant else [],
            'tenant_type': self.tenant.tenant_type if self.tenant else 'Tenant',
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'allocated_slots': self.allocated_slots,
            'subscription_plan_id': self.subscription_plan_id,
            'subscription_plan_name': self.subscription_plan.name if self.subscription_plan else 'Custom Plan',
            'subscription_vehicle_type': self.subscription_plan.vehicle_type if self.subscription_plan else None,
            'amount_paid': self.amount_paid,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'transaction_id': self.transaction_id,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'status': self.status,
            'effective_status': effective_status,
            'is_active': self.is_active,
            'is_current': effective_status == 'Active',
            'is_expired': effective_status == 'Expired',
            'created_at': serialize_datetime(self.created_at)
        }


class TenantVehicle(db.Model):
    __tablename__ = 'tenant_vehicles'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    license_plate = db.Column(db.String(20), unique=True, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'license_plate': self.license_plate
        }

class ParkingSettings(db.Model):
    __tablename__ = 'parking_settings'

    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey('locations.id', ondelete="CASCADE"), nullable=True)
    total_visitor_slots = db.Column(db.Integer, default=100)
    total_tenant_slots = db.Column(db.Integer, default=100)
    
    visitor_reserved = db.Column(db.Integer, default=0)
    tenant_reserved = db.Column(db.Integer, default=0)
    
    visitor_occupied_override = db.Column(db.Integer, default=None)
    tenant_occupied_override = db.Column(db.Integer, default=None)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'location_id': self.location_id,
            'total_visitor_slots': self.total_visitor_slots,
            'total_tenant_slots': self.total_tenant_slots,
            'visitor_reserved': self.visitor_reserved,
            'tenant_reserved': self.tenant_reserved,
            'visitor_occupied_override': self.visitor_occupied_override,
            'tenant_occupied_override': self.tenant_occupied_override,
            'updated_at': serialize_datetime(self.updated_at)
        }
class DeviceConfig(db.Model):
    __tablename__ = 'device_config'

    id = db.Column(db.Integer, primary_key=True)
    device_type = db.Column(db.Enum('ENTRY CAMERA', 'EXIT CAMERA', 'CONTROLLER', name='devices_enum'), nullable=False)
    device_name = db.Column(db.String(100), nullable=True)
    gate_name = db.Column(db.String(100), nullable=True)
    gate_type = db.Column(db.String(50), nullable=True, default='Unrestricted')
    ip_address = db.Column(db.String(100), nullable=False)
    mac_address = db.Column(db.String(100), nullable=False)
    port = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'device_type': self.device_type,
            'device_name': self.device_name,
            'gate_name': self.gate_name,
            'gate_type': self.gate_type,
            'ip_address': self.ip_address,
            'mac_address': self.mac_address,
            'port': self.port,
            'created_at': serialize_datetime(self.created_at)
        }

class Location(db.Model):
    __tablename__ = 'locations'

    id = db.Column(db.Integer, primary_key=True)
    location_name = db.Column(db.String(255), nullable=False, unique=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'location_name': self.location_name,
            'is_active': self.is_active,
            'created_at': serialize_datetime(self.created_at)
        }

class Visitor(db.Model):
    __tablename__ = 'visitors'

    id = db.Column(db.Integer, primary_key=True)
    visitor_name = db.Column(db.String(100), nullable=False)
    phone_number = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    vehicles = db.relationship('VisitorVehicle', backref='visitor', lazy=True, cascade="all, delete-orphan")
    subscriptions = db.relationship('VisitorSubscription', backref='visitor', lazy=True, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'visitor_name': self.visitor_name,
            'phone_number': self.phone_number,
            'vehicles': [v.license_plate for v in self.vehicles],
            'created_at': serialize_datetime(self.created_at)
        }

class VisitorSubscription(db.Model):
    __tablename__ = 'visitor_subscriptions'
    id = db.Column(db.Integer, primary_key=True)
    visitor_id = db.Column(db.Integer, db.ForeignKey('visitors.id'), nullable=False)
    subscription_plan_id = db.Column(db.Integer, db.ForeignKey('pricing.id'), nullable=True)
    
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    allocated_slots = db.Column(db.Integer, default=1)
    
    amount_paid = db.Column(db.Float, default=0.0)
    payment_method = db.Column(db.String(50))
    payment_status = db.Column(db.String(50), default='Pending')
    transaction_id = db.Column(db.String(100))
    payment_date = db.Column(db.Date)
    
    status = db.Column(
        db.Enum(*SUBSCRIPTION_STATUS_VALUES, name='visitor_subscription_status'),
        nullable=False,
        default=SUBSCRIPTION_STATUS_ACTIVE
    )
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def is_active(self):
        return self.status == SUBSCRIPTION_STATUS_ACTIVE

    def get_effective_status(self, reference_date=None):
        today = reference_date or datetime.utcnow().date()
        stored_status = (self.status or SUBSCRIPTION_STATUS_ACTIVE).lower()

        if stored_status == SUBSCRIPTION_STATUS_INACTIVE:
            return 'Inactive'
        if stored_status == SUBSCRIPTION_STATUS_EXPIRED:
            return 'Expired'
        if self.end_date and self.end_date < today:
            return 'Expired'
        if self.start_date and self.start_date > today:
            return 'Scheduled'
        if stored_status == SUBSCRIPTION_STATUS_ACTIVE:
            return 'Active'
        return 'Inactive'

    def to_dict(self):
        effective_status = self.get_effective_status()
        return {
            'id': self.id,
            'visitor_id': self.visitor_id,
            'visitor_name': self.visitor.visitor_name if self.visitor else "Unknown",
            'phone_number': self.visitor.phone_number if self.visitor else "",
            'vehicles': [v.license_plate for v in self.visitor.vehicles] if self.visitor else [],
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'allocated_slots': self.allocated_slots,
            'subscription_plan_id': self.subscription_plan_id,
            'subscription_plan_name': self.subscription_plan.name if self.subscription_plan else 'Custom Plan',
            'subscription_vehicle_type': self.subscription_plan.vehicle_type if self.subscription_plan else None,
            'amount_paid': self.amount_paid,
            'payment_method': self.payment_method,
            'payment_status': self.payment_status,
            'transaction_id': self.transaction_id,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'status': self.status,
            'effective_status': effective_status,
            'is_active': self.is_active,
            'is_current': effective_status == 'Active',
            'is_expired': effective_status == 'Expired',
            'created_at': serialize_datetime(self.created_at)
        }

class VisitorVehicle(db.Model):
    __tablename__ = 'visitor_vehicles'
    id = db.Column(db.Integer, primary_key=True)
    visitor_id = db.Column(db.Integer, db.ForeignKey('visitors.id'), nullable=False)
    license_plate = db.Column(db.String(20), unique=True, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'visitor_id': self.visitor_id,
            'license_plate': self.license_plate
        }
