class NotValidRoleException(Exception):
    """Exception raised when an invalid role is provided."""

    pass


class EmailAlreadyExists(Exception):
    """Exception raised when an email already exists."""

    pass


class UsernameAlreadyExists(Exception):
    """Exception raised when a username already exists."""

    pass


class UserNotFoundException(Exception):
    """Exception raised when a user is not found."""

    pass


class PasswordNotInvalidException(Exception):
    """Exception raised when a password is not correct."""

    pass


class OrderNotFoundException(Exception):
    """Exception raised when an order is not found."""

    pass


class OrderNotEnoughPermissions(Exception):
    """Exception raised when a user does not have enough permissions to access an order."""

    pass


class BidAlreadyExistsError(Exception):
    """Exception raised when a bid already exists for the same user and order."""

    pass


class BidNotFoundException(Exception):
    """Exception raised when a bid is not found."""

    pass


class BidNotPermissionError(Exception):
    """Exception raised when a user does not have permission to access a bid."""

    pass


class OrderAlreadyAssignedException(Exception):
    """Exception raised when an order is already assigned to an executor."""

    pass


class OrderNotHaveThisExecutor(Exception):
    """Exception raised when an order does not have a bid from the specified executor."""

    pass
