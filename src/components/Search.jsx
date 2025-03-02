import React from "react";
import styled from "styled-components";

// Responsive breakpoints
const breakpoints = {
  sm: "480px",
  md: "768px",
  lg: "1024px"
};

// Styled components for Search container and button
const SearchContainer = styled.div`
  max-width: min(100%, 800px);
  margin: 2rem auto;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  text-align: center;

  @media (max-width: ${breakpoints.md}) {
    margin: 1.5rem auto;
  }
`;

const SearchTitle = styled.h1`
  font-size: clamp(1.2rem, 3vw, 1.5rem);
  color: #ffffff; /* UC Davis Gold */
  text-transform: uppercase;
  margin-bottom: 1rem;
`;

const SearchButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50%;
  max-width: 400px;
  padding: clamp(0.6rem, 2vw, 0.8rem) clamp(1rem, 3vw, 1.5rem);
  margin: 1rem auto;
  font-size: clamp(1rem, 2vw, 1.2rem);
  font-weight: bold;
  text-transform: uppercase;
  border: none;
  border-radius: 8px;
  background: #ffbf00; /* UC Davis Gold */
  color: #022851; /* UC Davis Blue */
  cursor: pointer;
  transition: background 0.3s ease, transform 0.2s ease;
  box-shadow: 0 4px 10px rgba(255, 191, 0, 0.3);

  &:hover {
    background: #e6a700;
    transform: scale(1.05);
    box-shadow: 0 6px 14px rgba(255, 191, 0, 0.4);
  }

  &:active {
    transform: scale(0.98);
    box-shadow: 0 3px 8px rgba(255, 191, 0, 0.2);
  }

  @media (max-width: ${breakpoints.sm}) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const ButtonText = styled.span`
  margin-left: 0.5rem;
  font-size: clamp(1.2rem, 2.5vw, 1.5rem);

  @media (max-width: ${breakpoints.sm}) {
    margin-left: 0;
  }
`;

const SearchDescription = styled.p`
  color: #a3b8c2;
  font-size: clamp(0.875rem, 1.5vw, 1rem);
  margin-bottom: 1rem;
`;

// The Search component using styled components
export default function Search({handleSearchInitiation}) {
  return (
    <SearchContainer>
      <SearchTitle>Find Your Spot</SearchTitle>
      <SearchDescription>
        Quickly locate nearby bike racks with ease.
      </SearchDescription>
      <p>
        <SearchButton onClick={handleSearchInitiation}>
          <ButtonText>🔍 Locate</ButtonText>
        </SearchButton>
      </p>
    </SearchContainer>
  );
}
