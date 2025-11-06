"use client";

import type React from "react";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FacultyMember {
  name: string;
  profileUrl: string;
  website: string;
  researchAreas: string[];
}

export function FacultySearch() {
  const [searchType, setSearchType] = useState<"name" | "research">("name");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    try {
      const response = await fetch(
        `/api/search?type=${searchType}&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="space-y-8">
      <Tabs
        value={searchType}
        onValueChange={(value) => setSearchType(value as "name" | "research")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
          <TabsTrigger value="name">Search by Name</TabsTrigger>
          <TabsTrigger value="research">Search by Research Area</TabsTrigger>
        </TabsList>

        <TabsContent value="name" className="mt-6">
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Enter faculty name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="research" className="mt-6">
          <div className="flex gap-3">
            <Input
              type="text"
              placeholder="Enter research area (e.g., security, machine learning)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-muted-foreground">
            Searching faculty directory...
          </p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No faculty members found matching your search.
          </p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Found {results.length} faculty member
            {results.length !== 1 ? "s" : ""}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((faculty, index) => (
              <Card
                key={index}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="text-xl font-semibold mb-3 text-foreground">
                  {faculty.name}
                </h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">
                      Profile
                    </p>
                    <a
                      href={faculty.profileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {faculty.profileUrl}
                    </a>
                  </div>

                  {faculty.website && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">
                        Website
                      </p>
                      <a
                        href={faculty.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline break-all"
                      >
                        {faculty.website}
                      </a>
                    </div>
                  )}

                  {faculty.researchAreas.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">
                        Research Areas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {faculty.researchAreas.map((area, i) => (
                          <span
                            key={i}
                            className="inline-block rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
