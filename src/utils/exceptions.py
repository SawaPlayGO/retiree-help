class NotValidRoleException(Exception):
    """Exception raised when an invalid role is provided."""

    pass


class EmailAlreadyExists(Exception):
    """Exception raised when an invalid role is provided."""

    pass


class UsernameAlreadyExists(Exception):
    """Exception raised when an invalid role is provided."""

    pass


class UserNotFoundException(Exception):
    """Exception raised when a user is not found."""

    pass


class PasswordNotInvalidException(Exception):
    """Exception raised when a password is not correct."""

    pass
