package com.event.booking.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CustomUserPrincipal {
    private final String userId;
    private final String email;
    private final String role;
}
