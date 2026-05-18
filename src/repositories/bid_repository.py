from psycopg2 import IntegrityError
from sqlalchemy.orm import Session
from src.models.bid import Bid
from src.utils.exceptions import BidAlreadyExistsError


class BidRepository:
    """Repository for bid data access operations"""

    def __init__(self, session: Session):
        """Initialize repository with a database session

        :param session: SQLAlchemy database session
        """
        self.session = session

    def create_bid(self, bid_data: dict) -> Bid:
        """
        Create new bid.
        """

        try:
            bid = Bid(**bid_data)

            self.session.add(bid)
            self.session.commit()
            self.session.refresh(bid)

            return bid

        except IntegrityError as e:
            self.session.rollback()
            raise

    def get_bid_by_id(self, bid_id: int) -> Bid | None:
        return self.session.query(Bid).filter(Bid.id == bid_id).first()

    def update_bid(self, update_data: dict, bid_id: int) -> Bid | None:
        bid = self.session.query(Bid).filter_by(id=bid_id).first()
        if not bid:
            return None

        for key, value in update_data.items():
            setattr(bid, key, value)

        self.session.commit()
        self.session.refresh(bid)
        return bid

    def get_bids_by_order_id(self, order_id: int) -> list[Bid]:
        return self.session.query(Bid).filter(Bid.order_id == order_id).all()
